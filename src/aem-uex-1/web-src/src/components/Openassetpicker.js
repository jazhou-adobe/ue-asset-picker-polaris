/*
 * <license header>
 */

import React, { useState, useEffect, useRef } from "react";
import { attach } from "@adobe/uix-guest";
import {
  ActionButton,
  Image,
  Item,
  ListView,
  Provider,
  Text,
  View,
  defaultTheme,
  TooltipTrigger,
  Tooltip,
} from '@adobe/react-spectrum';
import { Label } from '@react-spectrum/label';
import Close from '@spectrum-icons/workflow/Close';
import VideoFilled from '@spectrum-icons/workflow/VideoFilled';
import { extensionId, assetSelectedEventName } from "./Constants";

function extractFileName(url) {
  const decodedUrl = decodeURIComponent(url);
  const regex = /\b(?:[a-zA-Z]:\\|\/)(?:[\w.-]+\\|\/)*([\w.-\s:]+\.[\w]+)\b/g;
  const match = decodedUrl.match(regex);
  console.log(match);
  if (match) {
      return match[0].slice(1);
  }
  throw new Error('File name can not be displayed for this asset.');
}

export default function () {
  const [guestConnection, setGuestConnection] = useState();
  const [assetUrl, setAssetUrl] = useState('');
  const [assetName, setAssetName] = useState('');
  const [extConfigUrl, setExtConfigUrl] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [imageLoadingError, setImageLoadingError] = useState();
  const fieldName = useRef();

  const handleStorageChange = (event) => {
      console.log(
          '@@ receiving event',
          event.key,
          `${assetSelectedEventName}-${fieldName.current}`,
          fieldName.current
      );
      if (event.key === `${assetSelectedEventName}-${fieldName.current}` && event.newValue) {
          const asset = JSON.parse(event.newValue);
          setAssetUrl(asset.assetUrl);
          setImageLoadingError(false);
      }
      localStorage.removeItem(event.key);
  };

  useEffect(() => {
      guestConnection?.host.field.onChange(assetUrl);
  }, [assetUrl]);

  const init = async () => {
      const connection = await attach({
          id: extensionId,
      });
      setGuestConnection(connection);
  };

  useEffect(() => {
      init().catch((e) => console.error('Extension got the error during initialization:', e));
      window.addEventListener('storage', handleStorageChange);

      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
  }, []);

  useEffect(() => {
      if (!guestConnection) {
          return;
      }
      const getState = async () => {
          const model = await guestConnection.host.field.getModel();
          setExtConfigUrl(model.configUrl);
          setFieldLabel(model.label || 'Asset');
          fieldName.current = model.name || 'Asset';

          if (!assetUrl) {
              setAssetUrl((await guestConnection.host.field.getValue()) || '');
          }
      };
      getState().catch((e) => console.error('Extension error:', e));
  }, [guestConnection]);

  const showModal = () => {
    window.localStorage.setItem('assetSelectorConfig', extConfigUrl);

    const searchParams = new URL(window.location.href).searchParams;

    guestConnection.host.modal.showUrl({
        title: 'DM Asset Picker',
        url: `/index.html#/open-asset-picker-modal/${fieldName.current}`,
        width: '80vw',
        height: '70vh',
    });
};

const removeAsset = () => {
  setAssetUrl('');
  setImageLoadingError(false);
  setAssetName('');
};

useEffect(() => {
  if (assetUrl) {
      try {
          const name = extractFileName(assetUrl);
          setAssetName(name);
      } catch (e) {
          console.error(e.message);
      }
  }
}, [assetUrl]);

  return (
    <Provider theme={defaultTheme} colorScheme="light">
    <View backgroundColor={'gray-75'} marginBottom={'size-200'}>
        <Label>{fieldLabel}</Label>
        <View
            backgroundColor={'gray-100'}
            marginBottom={'size-200'}
            padding={'size-100'}
            borderColor={'gray-200'}
            borderWidth={'thin'}
            borderRadius={'regular'}
        >
            {!assetUrl && (
                <ActionButton onPress={showModal} isQuiet={true}>
                    +Add
                </ActionButton>
            )}
            {assetUrl && (
                /**
                 * Listview component provides all necessary styles including text overflow ellipses, button positions etc.
                 * Plus it adds future prospects of adding more items in the picker, should we implement it.
                 */
                <ListView aria-label="ListView example with complex items" onAction={showModal}>
                    <Item>
                        {imageLoadingError ? (
                            <View marginEnd={'size-100'} height={'size-250'}>
                                <VideoFilled />
                            </View>
                        ) : (
                            <Image
                                src={assetUrl || ''}
                                onError={() => {
                                    setImageLoadingError(true);
                                }}
                            />
                        )}
                        <Text>{assetName}</Text>
                        <TooltipTrigger>
                            <ActionButton onPress={removeAsset} isQuiet={true}>
                                <Close />
                            </ActionButton>
                            <Tooltip>Remove item</Tooltip>
                        </TooltipTrigger>
                    </Item>
                </ListView>
            )}
        </View>
    </View>
</Provider>
  );
}
