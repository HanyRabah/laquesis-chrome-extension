'use strict';

var submitButtonElement = document.getElementById('submit'),
  experimentSelect = document.getElementById('experiments'),
  experimentVariation = document.getElementById('variation'),
  expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi,
  regex = new RegExp(expression),
  cookieValue,
  domain,
  cookieDomain;

window.onload = function() {
  chrome.tabs.getSelected(null, function(tab) {
    var currentURL = tab.url,
      domainParsed,
      value,
      valueParsed;

    // if (!currentURL.match(regex)) {
    //   noCookiesAvailable();
    //   return;
    // }

    domainParsed = currentURL.match(/^http[s]?:\/\/([^\/]+)/gm);
    cookieDomain = removeSubdomainFrom(domainParsed[0]);

    if (domainParsed && domainParsed.length === 1) {
      domain = domainParsed[0];
    }

    if (!domain) {
      return;
    }

    chrome.cookies.get(
      {
        url: domain,
        name: 'laquesis'
      },
      function(cookie) {
        if (!cookie || !cookie.value) {
          noCookiesAvailable();
          return;
        }
        cookieValue = cookie.value.replace(/['"]+/g, '');
        var laquesisCookieValue = cookieValue;
        var expObject = laquesisCookieValue.split('#');
        var expVariations = expObject.map(val => val.split('@'));
        // html elements

        expVariations.map((val, index) => {
          var opt = document.createElement('option');
          opt.appendChild(document.createTextNode(val[0]));
          opt.value = val[1];

          if (index === 0) {
            opt.selected = 'selected';
            experimentVariation.setAttribute('value', val[1]);
          }

          experimentSelect.appendChild(opt);
        });

        chrome.storage.sync.get(['name'], function(experiment) {
          var options = experimentSelect.options;
          for (const key of options) {
            if (key.textContent === experiment.name) {
              experimentSelect.selectedIndex = key.index;
              experimentVariation.setAttribute('value', key.value);
            }
          }
        });

        experimentSelect.onchange = function() {
          experimentVariation.setAttribute('value', this.value);
        };
      }
    );
  });
};

submitButtonElement.onclick = function() {
  var expName = experimentSelect[experimentSelect.selectedIndex].textContent;
  var expValue = experimentSelect[experimentSelect.selectedIndex].value;
  var newExpValue = experimentVariation.value;
  var oldVal = expName + '@' + expValue;
  var value = expName + '@' + newExpValue;

  var date = new Date();
  date.setDate(365);

  chrome.cookies.set(
    {
      domain: cookieDomain,
      url: domain,
      name: 'laquesis',
      value: cookieValue.replace(oldVal, value),
      expirationDate: Math.round(date.getTime() / 1000)
    },
    function(cookie) {
      var notifOptions = {
        type: 'basic',
        iconUrl: '../images/icons/laquesis_logo_48.png',
        title: 'Cookies Updated',
        message:
          'laquesis experiment ' +
          expName +
          ' has been updated! from ' +
          expValue +
          ' to ' +
          newExpValue
      };
      chrome.storage.sync.set({
        name: expName,
        old_variation: expValue,
        new_variation: newExpValue
      });
      chrome.notifications.getAll(function(runningNotif) {
        if (runningNotif[expName]) {
          chrome.notifications.clear(expName);
        }
        chrome.notifications.create(expName, notifOptions, function() {
          window.close();
          chrome.tabs.getSelected(null, function(tab) {
            var code = 'window.location.reload()';
            chrome.tabs.executeScript(tab.id, { code: code });
          });
        });
      });
    }
  );
};

var noCookiesAvailable = function() {
  document.getElementById('noCookies').textContent =
    'No Laquesis Cookies available!';
  document.getElementById('laquesisExperiments').classList.add('hidden');
  submitButtonElement.classList.add('hidden');
};

var removeSubdomainFrom = function(fullUrl = '') {
  const regex = {
    protocol: new RegExp(/http(s)*:\/\//),
    subdomain: new RegExp(/[^\.]*\.[^.]*$/)
  };
  let newUrl = fullUrl;
  let protocol = regex.protocol.exec(fullUrl);
  if (protocol && protocol.length) {
    newUrl = fullUrl.match(regex.subdomain)[0];
  }
  return newUrl;
};
