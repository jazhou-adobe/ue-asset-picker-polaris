/*
 * <license header>
 */

import React, { useState, useEffect, useRef } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Provider,
  Content,
  defaultTheme,
  Flex,
  TextField,
  ActionButton,
  Text,
  Image,
} from "@adobe/react-spectrum";
import { extensionId, assetSelectedEventName } from "./Constants";

export default function () {
  const customAssetField = useRef(null);
  const [guestConnection, setGuestConnection] = useState();
  const [model, setModel] = useState({});
  const [value, setValue] = useState('');

  const handleStorageChange = (event) => {
    if (event.key === assetSelectedEventName) {
      setValue(event.newValue);
      customAssetField.current.focus();
      localStorage.removeItem(assetSelectedEventName);
    }
  };

  const onChangeHandler = (event) => {
    const newValue = event.target.value;
    guestConnection.host.field.onChange(newValue);
};

  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
  };

  useEffect(() => {
    init().catch((e) =>
      console.error("Extension got the error during initialization:", e)
    );
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
      setModel(await guestConnection.host.field.getModel());
      if (!value) {
        setValue(await guestConnection.host.field.getValue() || '');
      }
    };
    getState().catch((e) => console.error("Extension error:", e));
  }, [guestConnection]);

  const showModal = () => {
    guestConnection.host.modal.showUrl({
      title: "Asset Picker",
      url: "/index.html#/open-asset-picker-modal",
      width: "80vw",
      height: "70vh",
    });
  };

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

  let url;
  let name = '';
  try {
    url = new URL(decodeURIComponent(extractStringBetween(value, '<p>', '</p>')));
    name = url?.pathname?.split('/')?.pop() || '';
  } catch (e) {}

  return (
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <Flex direction="column">
          <Text>Custom asset</Text>
          <TextField ref={customAssetField} value={value} flexGrow={1} isReadOnly onFocus={onChangeHandler} />
          <ActionButton onPress={showModal} height="size-600" marginStart="size-150" isQuiet>
            <Flex alignItems="center" margin="size-100">
              {url && <Image width="size-400" height="size-400" src={url.href || ''} alt={name} objectFit="cover" />}
              {url && <Text marginStart="size-150">
                {name}
              </Text>}
              {!url && <Text marginStart="size-150">
                No asset selected
              </Text>}
            </Flex>
          </ActionButton>
        </Flex>
      </Content>
    </Provider>
  );
}
