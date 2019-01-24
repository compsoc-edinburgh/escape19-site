function isOver18() {
    return $("#over18").is(":checked");
}

$(() => {

    var modal = $("#paymentModal");
    const loadingModal = $("#processingModal");
    var form = $("#payment-form");
    var example = form;
    var error = form.find('#card-input-error');

    var stripe = Stripe('{{ site.data.settings.api_stripe_pk }}');
    var elements = stripe.elements({
        fonts: [
            {
                cssSrc: "https://rsms.me/inter/inter-ui.css"
            }
        ]
    });

    function enableInputs() {
        form.find(
            "input, textarea, #payment-submit"
        ).attr('disabled', false);

        form.find(".alwaysDisabled").attr("disabled", true);
    }

    function disableInputs() {
        form.find(
            "input, textarea, #payment-submit"
        ).attr('disabled', true);
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
    //             $("#tickets-left").fadeOut();
    //         },
    //         success: function(data) {
    //             console.log("result", data);

    //             let text = data.Quantity + " tickets left!";
    //             if (data.Quantity === 1) {
    //                 text = data.Quantity + " ticket left!";
    //             } else if (data.Quantity === 0) {
    //                 text = "ALL SOLD OUT!";
    //                 $("#payment-form").remove();
    //                 clearInterval(checkTimeout);
    //             }
    //             $("#tickets-counter").text(text);

    //             if (data.Quantity <= 5) {
    //                 $("#tickets-left").removeClass("alert-warning");
    //                 $("#tickets-left").addClass("alert-danger");
    //             }
    //             $("#tickets-left").fadeIn();
    //         },
    //         timeout: 60000
    //     });
    // }

    // checkState();
    // checkTimeout = setInterval(checkState, 5000);

    function showError(text, forceEnabled) {
        // Hide error
        if (text == null) {
            error.addClass('d-none');
            if (!forceEnabled) {
                $("#payment-submit").attr("disabled", false);
            }
            return;
        }

        error.removeClass('d-none');
        error.text(text);
        if (!forceEnabled) {
            $("#payment-submit").attr("disabled", true);
        }
    }

    function completeResult(result, status) {
        if (result.complete) {
            result.complete(status);
        }
    }

    function onTokenReceived(result) {
        const FullName = $("#fullname").val();
        const UUN = $("#uun").val();
        const Email = $("#email").val();
        const Over18 = isOver18();
        const Starter = $("input[name='starterRadio']:checked").val();
        const Main = $("input[name='mainRadio']:checked").val();
        const Dessert = $("input[name='dessertRadio']:checked").val();
        const SpecialReqs = $("#specialReqs").val();
        const StaffCode = $("#staffCode").val();

        const data = {
            Token: result.token.id,
            FullName, UUN, Email, Over18,
            Starter, Main, Dessert,
            StaffCode,
            SpecialReqs,
        }

        showError(null, true)
        loadingModal.removeClass("d-none");
        loadingModal.addClass("d-flex");

        $.ajax({
            url: ENDPOINT_CHARGE,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            dataType: 'json',
            error: function(resp, textStatus, errorThrown) {
                console.log("ENDPOINT_CHARGE error", resp, textStatus, errorThrown);
                enableInputs();

                loadingModal.addClass("d-none");
                loadingModal.removeClass("d-flex");

                if (resp.responseJSON) {
                    showError(resp.responseJSON.message, true);
                } else {
                    showError("Unknown error / network error. Your card has not been charged.", true);
                }

                completeResult(result, "fail");
            },
            success: function(data) {
                console.log("success", data);

                $("#infball-ticket-button").attr("href", "{{ site.baseurl }}/infball-ticket?id=" + data.data);

                loadingModal.addClass("d-none");
                loadingModal.removeClass("d-flex");

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
            $(".card-only").addClass("d-none");
            $(".payment-request-available").removeClass("d-none");
            paymentRequestElement.mount("#payment-request-button");
        }
    });

    // Listen on the form's 'submit' handler...
    form.on('submit', e => {
        e.preventDefault();

        // Show a loading screen...
        console.log("Requestng token...")

        // Disable all inputs.
        disableInputs();

        // Gather additional customer data we have collected in our form.
        var name = form.find('#cardholder-name').val();
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
    });

    // Listen for errors from each Element, and show error messages in the UI.
    var savedErrors = {};
    [card, paymentRequestElement].forEach((element, idx) => {
        element.on('change', event => {
            if (event.error) {
                savedErrors[idx] = event.error.message;
                showError(event.error.message);
            } else {
                console.log("No new error!")
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
                } else {
                    // The user fixed the last error; no more errors.
                    showError(null);
                }
            }
        });
    });
})

