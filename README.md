# Asset picker extension

Welcome to my Adobe I/O Application!

## Setup

- Populate the `.env` file in the project root and fill it as shown [below](#env)
- Update your imsOrg and RepoId in 'OpenassetpickerModel'
- Adding the custom data type in your AEM project

```javascript
Add field in component models.json

...
      {
        "component": "custom-asset",
        "name": "custom-asset",
        "label": "Third party Asset",
        "valueType": "string"
      }
...

Update your block to read the delivery URL from properties.
Since AEM will auto block attributes with http value into a button. Here creates a workaround to cheat the auto-block. It will be good that the product can have a better solution.

Example of a card block I use

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {

  function extractStringBetween(originalString, startString, endString) {
    // Find the position of the start string
    var startIndex = originalString.indexOf(startString);
    if (startIndex === -1) {
        // Start string not found
        return null;
    }

    // Adjust the start index to exclude the start string itself
    startIndex += startString.length;

    // Find the position of the end string, starting from the position after the start string
    var endIndex = originalString.indexOf(endString, startIndex);
    if (endIndex === -1) {
        // End string not found
        return null;
    }

    // Extract the substring between the start and end indices
    return originalString.substring(startIndex, endIndex);
}
  /* change to ul, li */
  const ul = document.createElement('ul');
  var hasPolaris = false;
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } if (div.children.length === 1 && div.innerHTML.indexOf('<p>https')>-1) {
        div.className = 'cards-card-polaris';
        var imageUrl = decodeURIComponent(extractStringBetween(div.innerHTML, '<p>', '</p>'))
        div.innerHTML = '<img class="polaris" src="' + imageUrl + '">';
        hasPolaris = true;
      } else {
        div.className = 'cards-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => {
    if (img.className.indexOf('polaris') > -1) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);
}

```

## Local Dev

- `aio app run` to start your local Dev server
- App will run on `localhost:9080` by default

By default the UI will be served locally but actions will be deployed and served from Adobe I/O Runtime. To start a
local serverless stack and also run your actions locally use the `aio app run --local` option.

## Test & Coverage

- Run `aio app test` to run unit tests for ui and actions
- Run `aio app test --e2e` to run e2e tests

## Deploy & Cleanup

- `aio app deploy` to build and deploy all actions on Runtime and static files to CDN
- `aio app undeploy` to undeploy the app

## Config

### `.env`

You can generate this file using the command `aio app use`. 

```bash
# This file must **not** be committed to source control

## please provide your Adobe I/O Runtime credentials
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=
```

### `app.config.yaml`

- Main configuration file that defines an application's implementation. 
- More information on this file, application configuration, and extension configuration 
  can be found [here](https://developer.adobe.com/app-builder/docs/guides/appbuilder-configuration/#appconfigyaml)

#### Action Dependencies

- You have two options to resolve your actions' dependencies:

  1. **Packaged action file**: Add your action's dependencies to the root
   `package.json` and install them using `npm install`. Then set the `function`
   field in `app.config.yaml` to point to the **entry file** of your action
   folder. We will use `webpack` to package your code and dependencies into a
   single minified js file. The action will then be deployed as a single file.
   Use this method if you want to reduce the size of your actions.

  2. **Zipped action folder**: In the folder containing the action code add a
     `package.json` with the action's dependencies. Then set the `function`
     field in `app.config.yaml` to point to the **folder** of that action. We will
     install the required dependencies within that directory and zip the folder
     before deploying it as a zipped action. Use this method if you want to keep
     your action's dependencies separated.

## Debugging in VS Code

While running your local server (`aio app run`), both UI and actions can be debugged, to do so open the vscode debugger
and select the debugging configuration called `WebAndActions`.
Alternatively, there are also debug configs for only UI and each separate action.

## Typescript support for UI

To use typescript use `.tsx` extension for react components and add a `tsconfig.json` 
and make sure you have the below config added
```
 {
  "compilerOptions": {
      "jsx": "react"
    }
  } 
```

## Use in your Crosswalk project

component-definition.json
```
          "title": "Dynamic Media Asset",
          "id": "dm-asset",
          "plugins": {
            "xwalk": {
              "page": {
                "resourceType": "core/franklin/components/block/v1/block",
                "template": {
                  "name": "Dynamic Media Asset",
                  "model": "dm-asset"
                }
              }
            }
          }
```

component-model.json

```
  {
    "id": "dm-asset",
    "fields": [
      {
        "component": "text",
        "name": "dm_alttext",
        "label": "Alt Text",
        "valueType": "string"
      },
      {
        "component": "external-asset",
        "name": "external-asset",
        "label": "External Asset",
        "valueType": "string"
      }
    ]
  }
```

create a js called dynamic-media-asset.js in blocks/dynamic-media-asset folder

```
import { picture, source, img } from '../../scripts/dom-helpers.js';

// Main function to decorate the block
export default async function decorate(block) {
    console.log('Decorating dynamic-media-asset block');
    block.querySelectorAll('a[href^="https://smartimaging"]').forEach((a) => {
        const url = new URL(a.href.split('?')[0]);
        if (url.hostname.endsWith('.scene7.com')) {
          const pictureEl = picture(
            source({ srcset: `${url.href}?wid=1400`, type: 'image/webp', media: '(min-width: 992px)' }),
            source({ srcset: `${url.href}?wid=1320`, type: 'image/webp', media: '(min-width: 768px)' }),
            source({ srcset: `${url.href}?wid=780`, type: 'image/webp', media: '(min-width: 320px)' }),
            source({ srcset: `${url.href}?wid=1400`, media: '(min-width: 992px)' }),
            source({ srcset: `${url.href}?wid=1320`, media: '(min-width: 768px)' }),
            source({ srcset: `${url.href}?wid=780`, media: '(min-width: 320px)' }),
            img({ src: `${url.href}?wid=1400`, alt: a.innerText }),
          );
          a.replaceWith(pictureEl);
        }
      });
}
```

create a dom-helper.js file in script folder.
```
/* eslint-disable no-param-reassign */

/**
 * Example Usage:
 *
 * domEl('main',
 *  div({ class: 'card' },
 *  a({ href: item.path },
 *    div({ class: 'card-thumb' },
 *     createOptimizedPicture(item.image, item.title, 'lazy', [{ width: '800' }]),
 *    ),
 *   div({ class: 'card-caption' },
 *      h3(item.title),
 *      p({ class: 'card-description' }, item.description),
 *      p({ class: 'button-container' },
 *       a({ href: item.path, 'aria-label': 'Read More', class: 'button primary' }, 'Read More'),
 *     ),
 *   ),
 *  ),
 * )
 */

/**
 * Helper for more concisely generating DOM Elements with attributes and children
 * @param {string} tag HTML tag of the desired element
 * @param  {[Object?, ...Element]} items: First item can optionally be an object of attributes,
 *  everything else is a child element
 * @returns {Element} The constructred DOM Element
 */
export function domEl(tag, ...items) {
    const element = document.createElement(tag);
  
    if (!items || items.length === 0) return element;
  
    if (!(items[0] instanceof Element || items[0] instanceof HTMLElement) && typeof items[0] === 'object') {
      const [attributes, ...rest] = items;
      items = rest;
  
      Object.entries(attributes).forEach(([key, value]) => {
        if (!key.startsWith('on')) {
          element.setAttribute(key, Array.isArray(value) ? value.join(' ') : value);
        } else {
          element.addEventListener(key.substring(2).toLowerCase(), value);
        }
      });
    }
  
    items.forEach((item) => {
      item = item instanceof Element || item instanceof HTMLElement
        ? item
        : document.createTextNode(item);
      element.appendChild(item);
    });
  
    return element;
  }
  
  /*
    More short hand functions can be added for very common DOM elements below.
    domEl function from above can be used for one off DOM element occurrences.
  */
  export function div(...items) { return domEl('div', ...items); }
  export function p(...items) { return domEl('p', ...items); }
  export function a(...items) { return domEl('a', ...items); }
  export function h1(...items) { return domEl('h1', ...items); }
  export function h2(...items) { return domEl('h2', ...items); }
  export function h3(...items) { return domEl('h3', ...items); }
  export function h4(...items) { return domEl('h4', ...items); }
  export function h5(...items) { return domEl('h5', ...items); }
  export function h6(...items) { return domEl('h6', ...items); }
  export function ul(...items) { return domEl('ul', ...items); }
  export function ol(...items) { return domEl('ol', ...items); }
  export function li(...items) { return domEl('li', ...items); }
  export function i(...items) { return domEl('i', ...items); }
  export function img(...items) { return domEl('img', ...items); }
  export function span(...items) { return domEl('span', ...items); }
  export function form(...items) { return domEl('form', ...items); }
  export function input(...items) { return domEl('input', ...items); }
  export function label(...items) { return domEl('label', ...items); }
  export function button(...items) { return domEl('button', ...items); }
  export function iframe(...items) { return domEl('iframe', ...items); }
  export function nav(...items) { return domEl('nav', ...items); }
  export function fieldset(...items) { return domEl('fieldset', ...items); }
  export function article(...items) { return domEl('article', ...items); }
  export function strong(...items) { return domEl('strong', ...items); }
  export function select(...items) { return domEl('select', ...items); }
  export function option(...items) { return domEl('option', ...items); }
  export function video(...items) { return domEl('video', ...items); }
  export function source(...items) { return domEl('source', ...items); }
  export function hr(...items) { return domEl('hr', ...items); }
  export function section(...items) { return domEl('section', ...items); }
  export function picture(...items) { return domEl('picture', ...items); }
  export function blockquote(...items) { return domEl('blockquote', ...items); }
  ```