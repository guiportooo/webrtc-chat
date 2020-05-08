import React from "react";
import { ConnectionConsumer, ChannelConsumer } from "./App";
import Admin from "./Admin";
import User from "./User";

const Container = ({ type }) => {
  console.log("container:type", type);
  return (
    <ConnectionConsumer>
      {({ connection, updateConnection }) => (
        <ChannelConsumer>
          {({ channel, updateChannel }) =>
            type === "admin" ? (
              <Admin
                connection={connection}
                updateConnection={updateConnection}
                channel={channel}
                updateChannel={updateChannel}
              ></Admin>
            ) : (
              <User
                connection={connection}
                updateConnection={updateConnection}
                channel={channel}
                updateChannel={updateChannel}
              ></User>
            )
          }
        </ChannelConsumer>
      )}
    </ConnectionConsumer>
  );
};

export default Container;
