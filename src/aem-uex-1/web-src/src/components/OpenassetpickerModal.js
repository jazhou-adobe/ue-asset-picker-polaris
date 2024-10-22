/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Provider,
  Content,
  defaultTheme,
} from "@adobe/react-spectrum";
import { AssetSelector } from '@assets/selectors';
import { assetSelectedEventName, extensionId } from "./Constants";
import { useParams } from 'react-router-dom';


const PREFERRED_RENDITION_DIMENSIONS = {
  minWidth: 0,
  maxWidth: 4000,
  minHeight: 0,
  maxHeight: 4000,
};

/* Used to select renditions and other values from response */
const REPO_SELECTOR = 'http://ns.adobe.com/adobecloud/rel/repository';

async function fetchExtConfig() {
  let assetSelectorConfigUrl = {};
  try {
      assetSelectorConfigUrl = localStorage.getItem('assetSelectorConfig');
      if (assetSelectorConfigUrl) {
          const extConfig = await fetch(assetSelectorConfigUrl)
              .then((response) => response.json())
              .catch((e) => console.error('Error while fetching extConfig:', e));
          return extConfig;
      }
  } catch (e) {
      console.log('Error while getting assetSelectorConfig from localStorage', e);
      return {};
  }
}

async function buildSelectorProps(extConfig) {
  console.log({ extConfig });
  const props = {};
  props.filterSchema = extConfig.filterSchema || [];
  props.aemTierType = extConfig.aemTierType || ['delivery', 'author'];
  props.apiKey = extConfig.apiKey || 'asset_search_service';
  props.repoNames = extConfig.repoNames?.length ? extConfig.repoNames : [];
  return props;
}

function selectRenditionsFromResponse(assetResponse) {
  if (!Array.isArray(assetResponse) || !assetResponse.length) {
      throw new Error('Asset response list must contain assets');
  }
  return {
      renditions: assetResponse[0]._links?.['http://ns.adobe.com/adobecloud/rel/rendition'],
      assetMimeType: assetResponse[0].mimetype,
  };
}

/**
* Selects largest image from the renditions list based on the preferred dimensions
*
* @param renditions image renditions
* @returns largestImage rendition
*/
function selectImageFromRenditions(renditions, preferredDimensionsFromConfig = {}) {
  if (!renditions || !renditions.length) {
      throw new Error('Rendition list must contain renditions');
  }

  let largestImage = null;
  let maxArea = 0;
  const dimensions = {
      ...PREFERRED_RENDITION_DIMENSIONS,
      ...preferredDimensionsFromConfig,
  };

  for (const image of renditions) {
      const { width, height } = image;
      if (
          width >= dimensions.minWidth &&
          width <= dimensions.maxWidth &&
          height >= dimensions.minHeight &&
          height <= dimensions.maxHeight
      ) {
          if (width * height > maxArea) {
              maxArea = width * height;
              largestImage = image;
          }
      }
  }
  if (largestImage === null) {
      //Cant find the image within the preferred dimensions, select the largest image
      console.log('Image with the preferred dimensions can not be found, selecting largest image.');
      for (const image of renditions) {
          const { width, height } = image;
          if (width * height > maxArea) {
              maxArea = width * height;
              largestImage = image;
          }
      }
  }
  console.log('Largest image:', JSON.stringify(largestImage));
  return largestImage;
}


export default function () {
  const [guestConnection, setGuestConnection] = useState();
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [extConfig, setExtConfig] = useState({});
  const [assetSelectorProps, setAssetSelectorProps] = useState({});
  const { fieldName } = useParams();
  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
    const extConfig = await fetchExtConfig();
    const selectorProps = await buildSelectorProps(extConfig);
    setExtConfig(extConfig);
    setAssetSelectorProps(selectorProps);
  };

  useEffect(() => {
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onSelectionHandler = (assetResponse) => {
    console.log('@@ asset json response:');
    console.log(`@@ ${JSON.stringify(assetResponse)}`);
    let assetUrl, assetType;

    if (assetResponse[0]?.['repo:scene7File']) {
       assetUrl =  'https://smartimaging.scene7.com/is/image/'+assetResponse[0]['repo:scene7File'];
       assetType = assetResponse[0].mimetype;
    } else {
      const { renditions, assetMimeType } = selectRenditionsFromResponse(assetResponse);
      if (assetMimeType.startsWith('image')) {
        const preferredImage = selectImageFromRenditions(renditions, extConfig.preferredDimensions);
        if (preferredImage === null) {
            console.error('Error occurred while selecting rendition.');
            return;
        }
        assetUrl = preferredImage.href;
        assetType = preferredImage.mimetype || preferredImage.type;
      } else {
          //for video assets, select video asset available ignoring size
          try {
              assetUrl = renditions.find(
                  (rendition) =>
                      rendition.type?.startsWith('video') ||
                      rendition.mimetype?.startsWith('video') ||
                      rendition.href.endsWith('play')
              )?.href;
              assetType = assetMimeType;
          } catch (error) {
              console.error('Cant select video rendition: ', error);
          }
      }
    }

    console.log('@@ sending event', `${assetSelectedEventName}-${fieldName}`, assetUrl, assetType);

    window.localStorage.setItem(
        `${assetSelectedEventName}-${fieldName}`,
        JSON.stringify({
            assetUrl,
            assetType,
        })
    );
    
    onCloseHandler();
  };

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  const filterRepos = (repos) => {
    const repoName = endpoint.replace("https://", "").replace(/\/$/, "");
    return repos.filter((repo) => {
      return (
        repo._embedded["http://ns.adobe.com/adobecloud/rel/repository"][
          "aem:tier"
        ] === "delivery" ||
        repo._embedded["http://ns.adobe.com/adobecloud/rel/repository"][
          "repo:repositoryId"
        ] === repoName
      );
    });
  };

  useEffect(() => {
    if (!guestConnection) {
      return;
    }
    const getState = async () => {
      const context = guestConnection.sharedContext;
      const imsToken = context.get("token");
      setToken(imsToken);
      const tempEditorState = await guestConnection.host.editorState.get();
      const { connections, customTokens } = tempEditorState;
      const tempEndpointName = Object.keys(connections).filter((key) =>
        connections[key].startsWith("xwalk:")
      )[0];
      if (tempEndpointName) {
        setEndpoint(connections[tempEndpointName].replace("xwalk:", ""));
        if (customTokens && customTokens[tempEndpointName]) {
          setToken(customTokens[tempEndpointName].replace("Bearer ", ""));
        }
      }
    };
    getState().catch((e) => console.error("Extension error:", e));
  }, [guestConnection]);

  return (
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <AssetSelector
          aemTierType={['author']}
          dialogSize='fullscreen'
          apiKey="asset_search_service"
          imsToken={token}
          imsOrg="716E61785DF4006C0A495ED2@AdobeOrg"
          repositoryId= "author-p53578-e342845.adobeaemcloud.com"
          handleSelection={onSelectionHandler}
          onClose={onCloseHandler}
          filterRepoList={filterRepos}
        />
      </Content>
    </Provider>
  );
}
