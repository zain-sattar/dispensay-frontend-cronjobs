/* eslint-disable no-console */
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const {generateMessageBody, notifyOnSlack, purgeCache} = require('../index.js')

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const ZLD_PURGE_CACHE_WEBHOOK = process.env.ZLD_PURGE_CACHE_WEBHOOK
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_ACTION_URL=`${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`

const sweedStates = ['arizona', 'pennsylvania', 'west-virginia']

const getLocations = async () => {
  const payload = {
    query:
      'query NewQuery {\n  locations(first: 1000) {\n    edges {\n      node {\n        slug\n        title\n        uri\n        locationId\n        nap {\n          state {\n            ... on State {\n              title\n              slug\n            }\n          }\n        }\n        storeEmbeds {\n          klaviyoId\n          recreationalStoreId\n          sweedEmbedUrl\n          medicalStoreId\n        }\n      }\n    }\n  }\n}',
    variables: null,
    operationName: 'NewQuery'
  }

  const response = await fetch('https://admin.zenleafdispensaries.com/index.php?graphql', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    }
  })

  const locations = await response.json()
  return locations
}

const scrapJaneMenuPage = async (url) => {
  try {
    // add 'isCeerio' query params to ignore the google analytics
    const queryParams = {
      isCheerio: true
    }
    const queryString = new URLSearchParams(queryParams).toString()
    const urlWithQuery = `${url}?${queryString}`
    const response = await fetch(urlWithQuery)
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      const storeMainContent = $('.store-main-content')

      if (storeMainContent.length > 0) {
        return {message: 'Menu page loaded for: ', url: url, status: response.status}
      } else {
        return {message: 'Store embed not loaded for: ', url: url, status: response.status}
      }
    } else {
      throw {message: 'Error occured at: ', url: url, status: response.status, error: response}
    }
  } catch (error) {
    throw {message: `Error: Failed to fetch ${url}`, ...error}
  }
}

const scrapSweedMenuPage = async (url) => {
  try {
    // add 'isCeerio' query params to ignore the google analytics
    const queryParams = {
      isCheerio: true
    }
    const queryString = new URLSearchParams(queryParams).toString()
    const urlWithQuery = `${url}?${queryString}`
    const response = await fetch(urlWithQuery)
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      const baseElement = $('head base')
      const baseHref = baseElement.attr('href')
      if (baseHref.length > 0) {
        return {message: 'Menu page loaded for: ', url: url, status: response.status}
      } else {
        return {message: 'Store embed not loaded for: ', url: url, status: response.status}
      }
    } else {
      throw {message: 'Error occured at: ', url: url, status: response.status, error: response}
    }
  } catch (error) {
    throw {message: `Error: Failed to fetch ${url}`, ...error}
  }
}

/**
 * Scrapes menu pages for store all locations
 * @async
 * @function testMenuPages
 * @return {void} A Promise that resolves when the function finishes execution or rejects if an error occurs.
 * @throws {Error} If an error is encountered during the process, it throws an error and exits the loop.
 */
async function testMenuPages() {
  try {
    const baseUrl = 'https://zenleafdispensaries.com'
    let storeLocations = await getLocations()
    storeLocations = storeLocations.data.locations.edges
    for (let storeLocation of storeLocations) {
      try {
        storeLocation = storeLocation.node
        const uri = storeLocation.uri
        const medStoreId = storeLocation.storeEmbeds.medicalStoreId
        const recStoreId = storeLocation.storeEmbeds.recreationalStoreId
        const geostate = storeLocation.nap.state.slug
        if (medStoreId || recStoreId) {
          let result, url
          if (sweedStates.includes(geostate)) {
            if (geostate === 'arizona') {
              url = `${baseUrl}${uri}menu`
              result = await scrapSweedMenuPage(url)
              console.log(result)
            } else {
              url = `${baseUrl}${uri}medical-menu`
              result = await scrapSweedMenuPage(url)
              console.log(result)
            }
          } else {
            if (medStoreId) {
              url = `${baseUrl}${uri}medical-menu`
              result = await scrapJaneMenuPage(url)
              console.log(result)
            }
            if (recStoreId) {
              url = `${baseUrl}${uri}recreational-menu`
              result = await scrapJaneMenuPage(url)
              console.log(result)
            }
          }
        }
      } catch (error) {
        console.error(error)
        const result = await purgeCache(ZLD_PURGE_CACHE_WEBHOOK, baseUrl)
        console.log(result)

        const message = {
          errorMessage: error.message,
          url: error.url,
          errorType: error.status,
          resolutionMessage: result.message,
          baseUrl: result.domainUrl,
          githubActionUrl:GITHUB_ACTION_URL
        }
        await notifyOnSlack(SLACK_WEBHOOK_URL, generateMessageBody(message))
        throw error // Throw the error to exit the loop
      }
    }
  } catch (error) {
    console.error('Something went worng.', error)
  }
}

testMenuPages()
