Small JS lambda to check status of sitemap.

It takes two environmental variables SITEMAP_URL and SITEMAP_GZIP_URL.
If any of them is set - this app retrieves this sitemap, parses it and checks the first occurence's date. 
If it's more than value of environmental variable DATE_THRESHOLD or 24 hours - it will raise error.

For notifications we have SLACK_WEBHOOK and SLACK_WEBHOOK_CHANNEL env variables. Please, use them to send notifications to slack.