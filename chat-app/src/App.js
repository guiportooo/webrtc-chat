import React, { useState, createContext } from "react";
import { Button } from "semantic-ui-react";
import Container from "./Container";

const ConnectionContext = createContext({
  connection: null,
  updateConnection: () => {},
});

const ChannelContext = createContext({
  channel: null,
  updateChannel: () => {},
});

const App = () => {
  const [connection, setConnection] = useState(null);
  const [channel, setChannel] = useState(null);
  const [type, setType] = useState("");

  const updateConnection = (conn) => {
    setConnection(conn);
  };

  const updateChannel = (chn) => {
    setChannel(chn);
  };

  return type === "" ? (
    <>
      <Button onClick={() => setType("host")} color="teal">
        Enter as Host
      </Button>
      <Button onClick={() => setType("guest")} color="teal">
        Enter as Guest
      </Button>
    </>
  ) : (
    <ConnectionContext.Provider value={{ connection, updateConnection }}>
      <ChannelContext.Provider value={{ channel, updateChannel }}>
        <Container type={type} />
      </ChannelContext.Provider>
    </ConnectionContext.Provider>
  );
};

export const ConnectionConsumer = ConnectionContext.Consumer;
export const ChannelConsumer = ChannelContext.Consumer;
export default App;
