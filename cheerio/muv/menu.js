/* eslint-disable no-console */
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const {purgeCache, notifyOnSlack, generateMessageBody} = require('../index.js')

const MUV_PURGE_CACHE_WEBHOOK = process.env.MUV_PURGE_CACHE_WEBHOOK
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

const getLocations = async () => {
  const payload = {
    query:
      'query NewQuery {\n  locations(first: 1000) {\n    edges {\n      node {\n        slug\n        title\n        uri\n        locationId\nnap {\n          state {\n            ... on State {\n              title\n              slug\n            }\n          }\n        }\n        storeEmbeds {\n          klaviyoId\n          recreationalStoreId\n          sweedEmbedUrl\n          medicalStoreId\n        }\n        \n      }\n    }\n  }\n}',
    variables: null,
    operationName: 'NewQuery'
  }

  const response = await fetch('https://admin.muvfl.com/index.php?graphql', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8' // 'Content-Type' correction
    }
  })

  const locations = await response.json()
  return locations
}

const scrapMenuPage = async (url) => {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      // Check if the specific section with class "store-main-content" exists
      const storeMainContent = $('.store-main-content')

      if (storeMainContent.length > 0) {
        return {message: `Menu page loaded for  ${url}`, status: response.status}
      } else {
        throw {message: `Store embed not loaded for  ${url}`, status: response.status}
      }
    } else {
      throw {message: `Error occured at: ${url}`, error: response}
    }
  } catch (error) {
    throw {message: `Error: Failed to fetch ${url}`, ...error}
  }
}

async function testMenuPages() {
  try {
    const baseUrl = 'https://muvfl.com'
    console.log('MUV_PURGE_CACHE_WEBHOOK: ', MUV_PURGE_CACHE_WEBHOOK)
    console.log('SLACK_WEBHOOK_URL: ', SLACK_WEBHOOK_URL)
    let storeLocations = await getLocations()
    storeLocations = storeLocations.data.locations.edges
    for (let storeLocation of storeLocations) {
      try {
        storeLocation = storeLocation.node
        const uri = storeLocation.uri
        const storeId = storeLocation.storeEmbeds.medicalStoreId
        // if (storeId) {
          const url = `${baseUrl}${uri}/menu/`
          const result = await scrapMenuPage(url)
          console.log(result)
        // }
      } catch (error) {
        console.error(error)
        await notifyOnSlack(SLACK_WEBHOOK_URL, generateMessageBody(error.message))
        const result = await purgeCache(MUV_PURGE_CACHE_WEBHOOK, baseUrl)
        console.log(result)
        await notifyOnSlack(SLACK_WEBHOOK_URL, generateMessageBody(result.message))
        throw error // Throw the error to exit the loop
      }
    }
  } catch (error) {
    console.error('Something went worng.', error)
  }
}

testMenuPages()
