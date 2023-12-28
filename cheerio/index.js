/* eslint-disable no-console */
const fetch = require('node-fetch')

async function purgeCache(purgeWebhookURL, domainUrl) {
  try {
    const response = await fetch(purgeWebhookURL, {
      method: 'POST'
    })
    if (response.ok) {
      const jsonResonse = await response.json()
      return {message: `Domain cache is being purged for ${domainUrl}`, status: response.status, jsonResonse}
    } else {
      throw response
    }
  } catch (error) {
    return {message: `Error occured while purging cache for ${domainUrl}`, error}
  }
}
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
const generateMessageBody = (message) => {
  return {
    text: message
  }
}

module.exports = {
  purgeCache,
  notifyOnSlack,
  generateMessageBody
}
