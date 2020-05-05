import React from "react";
import { ConnectionConsumer, ChannelConsumer } from "./App";
import Chat from "./Chat";

const Container = () => {
  return (
    <ConnectionConsumer>
      {({ connection, updateConnection }) => (
        <ChannelConsumer>
          {({ channel, updateChannel }) => (
            <Chat
              connection={connection}
              updateConnection={updateConnection}
              channel={channel}
              updateChannel={updateChannel}
            ></Chat>
          )}
        </ChannelConsumer>
      )}
    </ConnectionConsumer>
  );
};

export default Container;
