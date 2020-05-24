const http = require('http');

const wakeUp = (url, interval) => {
  setTimeout(() => {
    try {
      http.get(url, () => {
        console.log(`Making request to ${url}`);
      });
    } catch (e) {
      console.log(`Error pinging ${url}`);
    } finally {
      wakeUp(url, interval);
    }
  });
};

module.exports = wakeUp;
