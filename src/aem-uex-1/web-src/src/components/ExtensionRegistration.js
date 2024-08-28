/*
 * <license header>
 */

import { Text } from "@adobe/react-spectrum";
import { register } from "@adobe/uix-guest";
import { extensionId } from "./Constants";

function ExtensionRegistration() {
  const init = async () => {
    const guestConnection = await register({
      id: extensionId,
      methods: {
        canvas: {
          getRenderers() {
            console.log('getRenderers' );
            return [
              // @todo YOUR CUSTOM DATA FIELD RENDERERS DECLARATION SHOULD BE HERE
              {
                extension: 'asset-picker-field',
                dataType: 'custom-asset',
                url: '/index.html#/open-asset-picker',
                icon: 'OpenIn',
              },
            ];
          },
        },
      }
    });
  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM)...</Text>;
}

export default ExtensionRegistration;
