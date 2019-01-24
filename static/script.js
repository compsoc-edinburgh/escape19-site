---
---
function isOver18() {
    return document.getElementById("over18").checked;
}

document.addEventListener('DOMContentLoaded', () => {

    var modal = document.getElementById("paymentModal");
    const loadingModal = document.getElementById("processingModal");
    var form = document.getElementById("payment-form");
    var error = document.getElementById('card-input-error');

    var stripe = Stripe('{{ site.data.settings.api_stripe_pk }}');
    var elements = stripe.elements({
        fonts: [
            {
                cssSrc: "https://rsms.me/inter/inter-ui.css"
            }
        ]
    });

    function enableInputs() {
        const enables = form.querySelectorAll(
            "input, textarea, #payment-submit"
        );
        enables.forEach(e => e.removeAttribute('disabled'));

        const disables = form.querySelectorAll(".alwaysDisabled");
        disables.forEach(e => e.setAttribute("disabled", true));
    }

    function disableInputs() {
        const items = form.querySelectorAll(
            "input, textarea, #payment-submit"
        );
        items.forEach(e => e.setAttribute('disabled', true));
    }

    const ENDPOINT_BASE = '{{ site.data.settings.api_endpoint }}';
    const ENDPOINT_CHARGE = ENDPOINT_BASE + '/charge';
    const ENDPOINT_STATS = ENDPOINT_BASE + '/stats';

    // let checkTimeout;
    // function checkState() {
    //     $.ajax({
    //         url: ENDPOINT_STATS,
    //         type: 'GET',
    //         contentType: 'application/json',
    //         dataType: 'json',
    //         error: function(resp, textStatus, errorThrown) {
    //             document.getElementById("tickets-left").fadeOut();
    //         },
    //         success: function(data) {
    //             console.log("result", data);

    //             let text = data.Quantity + " tickets left!";
    //             if (data.Quantity === 1) {
    //                 text = data.Quantity + " ticket left!";
    //             } else if (data.Quantity === 0) {
    //                 text = "ALL SOLD OUT!";
    //                 document.getElementById("payment-form").remove();
    //                 clearInterval(checkTimeout);
    //             }
    //             document.getElementById("tickets-counter").text(text);

    //             if (data.Quantity <= 5) {
    //                 document.getElementById("tickets-left").classList.remove("alert-warning");
    //                 document.getElementById("tickets-left").classList.add("alert-danger");
    //             }
    //             document.getElementById("tickets-left").fadeIn();
    //         },
    //         timeout: 60000
    //     });
    // }

    // checkState();
    // checkTimeout = setInterval(checkState, 5000);

    function showError(text, forceEnabled) {
        // Hide error
        if (text == null) {
            error.classList.add('d-none');
            if (!forceEnabled) {
                document.getElementById("payment-submit").removeAttribute("disabled");
            }
            return;
        }

        error.classList.remove('d-none');
        error.innerText = text;
        if (!forceEnabled) {
            document.getElementById("payment-submit").setAttribute("disabled", true);
        }
    }

    function completeResult(result, status) {
        if (result.complete) {
            result.complete(status);
        }
    }

    function onTokenReceived(result) {
        const FullName = document.getElementById("fullname").value;
        const Email = document.getElementById("email").value;
        const Over18 = isOver18();

        const data = {
            Token: result.token.id,
            FullName, Email, Over18,
        }

        console.log("Submitting data", data);

        showError(null, true)
        loadingModal.classList.remove("d-none");
        loadingModal.classList.add("d-flex");

        $.ajax({
            url: ENDPOINT_CHARGE,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            dataType: 'json',
            error: function(resp, textStatus, errorThrown) {
                console.log("ENDPOINT_CHARGE error", resp, textStatus, errorThrown);
                enableInputs();

                loadingModal.classList.add("d-none");
                loadingModal.classList.remove("d-flex");

                if (resp.responseJSON) {
                    showError(resp.responseJSON.message, true);
                } else {
                    showError("Unknown error / network error. Your card has not been charged.", true);
                }

                completeResult(result, "fail");
            },
            success: function(data) {
                console.log("success", data);

                document.getElementById("infball-ticket-button").attr("href", "{{ site.baseurl }}/infball-ticket?id=" + data.data);

                loadingModal.classList.add("d-none");
                loadingModal.classList.remove("d-flex");

                modal.modal("show");

                completeResult(result, "success")
            },
            timeout: 60000
        });
    }

    /**
    * Card Element
    */
    var card = elements.create("card", {
        style: {
            base: {
                color: "#32325D",
                fontWeight: 500,
                fontFamily: "Inter UI, Open Sans, Segoe UI, sans-serif",
                fontSize: "15px",
                fontSmoothing: "antialiased",

                "::placeholder": {
                    color: "#CFD7DF"
                }
            },
            invalid: {
                color: "#E25950"
            }
        }
    });

    card.mount("#payment-card");

    /**
    * Payment Request Element
    */
    var paymentRequest = stripe.paymentRequest(
        {
            country: "GB",
            currency: "gbp",
            requestPayerName: true,
            total: {
                amount: 4000,
                label: "Informatics Ball 2018",
            }
        }
    );

    paymentRequest.on("token", function(result) {
        onTokenReceived(result);
    });

    var paymentRequestElement = elements.create("paymentRequestButton",
        {
            paymentRequest: paymentRequest,
            style: {
                paymentRequestButton: {
                    type: "buy",
                    theme: "light-outline"
                }
            }
        }
    );

    paymentRequest.canMakePayment().then(result => {
        if (result) {
            document.getElementsByClassName("card-only").classList.add("d-none");
            document.getElementsByClassName("payment-request-available").classList.remove("d-none");
            paymentRequestElement.mount("#payment-request-button");
        }
    });

    // Listen on the form's 'submit' handler...
    form.onsubmit = e => {
        e.preventDefault();

        // Show a loading screen...
        console.log("Requestng token...")

        // Disable all inputs.
        disableInputs();

        // Gather additional customer data we have collected in our form.
        var name = document.getElementById('cardholder-name').value;
        var additionalData = {
            name
        };

        // Use Stripe.js to create a token. We only need to pass in one Element
        // from the Element group in order to create a token. We can also pass
        // in the additional customer data we collected in our form.
        stripe.createToken(card, additionalData).then(result => {
            // Stop loading!
            console.log("Token received!");

            if (result.token) {
                // If we received a token, show the token ID.
                onTokenReceived(result);
            } else {
                // Otherwise, un-disable inputs.
                enableInputs();
            }
        });
    };

    // Listen for errors from each Element, and show error messages in the UI.
    var savedErrors = {};
    [card, paymentRequestElement].forEach((element, idx) => {
        element.on('change', event => {
            if (event.error) {
                savedErrors[idx] = event.error.message;
                showError(event.error.message);
                console.log("Error shown!")
            } else {
                savedErrors[idx] = null;

                // Loop over the saved errors and find the first one, if any.
                var nextError = Object.keys(savedErrors)
                    .sort()
                    .reduce(function(maybeFoundError, key) {
                        return maybeFoundError || savedErrors[key];
                    },
                    null
                );

                if (nextError) {
                    // Now that they've fixed the current error, show another one.
                    showError(nextError);
                    console.log("Show next error!")
                } else {
                    console.log("Last error fixed!")
                    // The user fixed the last error; no more errors.
                    showError(null);
                }
            }
        });
    });
}, false);
