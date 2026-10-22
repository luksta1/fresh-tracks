// Proxy for the USDA NRCS SNOTEL (AWDB) REST API.
// The browser calls /.netlify/functions/snotel?endpoint=stations|data&...
// Only the two endpoints below are allowed. Values are cache lifetimes in seconds.
const BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";
const ALLOWED = { stations: 86400, data: 900 };

exports.handler = async (event) => {
  const { endpoint, ...rest } = event.queryStringParameters || {};
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, endpoint)) {
    return { statusCode: 400, body: "Unknown endpoint" };
  }
  try {
    const res = await fetch(`${BASE}/${endpoint}?${new URLSearchParams(rest)}`, {
      headers: { accept: "application/json" }
    });
    return {
      statusCode: res.status,
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${ALLOWED[endpoint]}`
      },
      body: await res.text()
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
