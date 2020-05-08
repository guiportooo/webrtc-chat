import React from "react";
import { ConnectionConsumer, ChannelConsumer } from "./App";
import Host from "./Host";
import Guest from "./Guest";

const Container = ({ type }) => {
  return (
    <ConnectionConsumer>
      {({ connection, updateConnection }) => (
        <ChannelConsumer>
          {({ channel, updateChannel }) =>
            type === "host" ? (
              <Host
                connection={connection}
                updateConnection={updateConnection}
                channel={channel}
                updateChannel={updateChannel}
              ></Host>
            ) : (
              <Guest
                connection={connection}
                updateConnection={updateConnection}
                channel={channel}
                updateChannel={updateChannel}
              ></Guest>
            )
          }
        </ChannelConsumer>
      )}
    </ConnectionConsumer>
  );
};

export default Container;
