/* eslint-disable no-console */
const fetch = require('node-fetch')

/**
 * Purges the cache for a specific domain using the provided purge webhook URL.
 * @async
 * @function purgeCache
 * @param  {string}          purgeWebhookURL - The URL used for purging the cache.
 * @param  {string}          domainUrl       - The domain for which the cache needs to be purged.
 * @return {Promise<object>}                 A Promise that resolves to an object containing purge status or an error message.
 */
async function purgeCache(purgeWebhookURL, domainUrl) {
  try {
    const response = await fetch(purgeWebhookURL, {
      method: 'POST'
    })
    if (response.ok) {
      const jsonResonse = await response.json()
      return {message: 'Domain cache is being purged for: ', domainUrl: domainUrl, status: response.status, jsonResonse}
    } else {
      throw response
    }
  } catch (error) {
    return {message: 'Error occured while purging cache for: ', domainUrl: domainUrl, error}
  }
}

/**
 * Sends a notification message to Slack using the provided URL and message body.
 * @async
 * @function notifyOnSlack
 * @param  {string}        url  - The URL used to send the notification to Slack.
 * @param  {object}        body - The message body to be sent as a notification.
 * @return {Promise<void>}      A Promise that resolves when the notification is sent successfully or logs an error if it fails.
 */
async function notifyOnSlack(url, body) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8' // 'Content-Type' correction
      }
    })
    if (response.ok) {
      console.log('Nofification sent successfully.')
    } else {
      throw {message: 'Failed to send nofification on slack', response}
    }
  } catch (error) {
    console.error(error)
  }
}

/**
 * Creates a rich text block with a title, description, and an optional URL.
 * @function createRichTextBlock
 * @param  {string}        title       - The title for the rich text block.
 * @param  {string}        description - The description for the rich text block.
 * @param  {string|null}   [url]       - The URL associated with the rich text block (optional, defaults to null).
 * @return {Array<object>}             An array representing a rich text block containing title, description, and divider elements.
 */
function createRichTextBlock(title, description, url = null) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'text',
              text: title,
              style: {
                bold: true
              }
            }
          ]
        }
      ]
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'text',
              text: description ? description : ' '
            },
            {
              type: 'link',
              url: url ? url : ' '
            }
          ]
        }
      ]
    },
    {
      type: 'divider'
    }
  ]
}

/**
 * Generates a message body containing rich text blocks based on the provided message object.
 * @function generateMessageBody
 * @param  {object} message - The message object containing error details.
 * @return {object}         An object representing the message body with rich text blocks.
 */
function generateMessageBody(message) {
  console.log(message);
  const blocks = []

  blocks.push(...createRichTextBlock('Error Type', message.errorType.toString()))
  blocks.push(...createRichTextBlock('Error Message', message.errorMessage, message.url))
  blocks.push(...createRichTextBlock('Resolution', message.resolutionMessage, message.baseUrl))
  blocks.push(...createRichTextBlock('Github Action Link', " ", message.githubActionUrl))
  const body = {blocks: blocks}
  return body
}

module.exports = {
  purgeCache,
  notifyOnSlack,
  generateMessageBody
}
