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

export default function () {
  const [guestConnection, setGuestConnection] = useState();
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");

  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
  };

  useEffect(() => {
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onSelectionHandler = (asset) => {
    localStorage.setItem(assetSelectedEventName, '<p>'+encodeURIComponent(asset[0]?._links['http://ns.adobe.com/adobecloud/rel/rendition'].href)+'</p>');
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
          aemTierType={['delivery', 'author']}
          dialogSize='fullscreen'
          apiKey="asset_search_service"
          imsToken={token}
          imsOrg="447AE26358FA40C50A495DB1@AdobeOrg"
          repositoryId= "delivery-p61927-e501064.adobeaemcloud.com"
          handleSelection={onSelectionHandler}
          onClose={onCloseHandler}
          filterRepoList={filterRepos}
        />
      </Content>
    </Provider>
  );
}
