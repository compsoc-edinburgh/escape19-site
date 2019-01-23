# SIGINT Escape Room 2018

This is the website for [SIGINT's Escape Room](https://escape.sigint.mx).

## Event details

- **Title**: Escape Room with SIGINT
- **Location**: Locked in Edinburgh (1 Summerhall Place)
- **Date**: Wed 30th January 6.45pm till 9.15pm
- **Cover image**: [here](/static/cover.png)
- **Description**:
    Come bring your leet hacker skills and join SIGINT as we face the challenge of breaking out of a room.
- **Organiser**: SIGINT
- **Cost**: £5 payable to COMPSOC
- **Limit**: limit of 23 tickets

## How to test

The quickest and easiest way to test, if you have Docker installed, is to run the following command (make sure your current directory is this repository):

```
docker run --volume=$(pwd):/src:Z --publish 4000:4000 grahamc/jekyll serve --watch -H 0.0.0.0
```
