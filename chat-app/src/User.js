import React, { Fragment, useState, useEffect, useRef } from "react";
import {
  Header,
  Loader,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import MessageBox from "./MessageBox";

const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }],
};

const User = ({ connection, updateConnection, channel, updateChannel }) => {
  const webSocket = useRef(null);
  const [socketOpened, setSocketOpened] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [alert, setAlert] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [room, setRoom] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [count, setCount] = useState([]);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesRef = useRef();

  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:9000");
    webSocket.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      setSocketMessages((prev) => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);

  useEffect(() => {
    let data = socketMessages.pop();
    if (data) {
      switch (data.type) {
        case "connect":
          setSocketOpened(true);
          break;
        case "enter":
          onEnter(data);
          break;
        case "updateRoom":
          updateRoom(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          break;
      }
    }
  }, [socketMessages]);

  const send = (data) => {
    webSocket.current.send(JSON.stringify(data));
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const onEnter = ({ success, message, room }) => {
    setLoggingIn(false);
    if (success) {
      setAlert(
        <SweetAlert
          success
          title="Success!"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      );
      setIsLoggedIn(true);
      setRoom(room);
      let localConnection = new RTCPeerConnection(configuration);
      // When the browser finds an ice candidate we send it to the other peer
      localConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          send({
            type: "candidate",
            candidate,
            room,
          });
        }
      };
      localConnection.ondatachannel = (event) => {
        let receivedChannel = event.channel;
        receivedChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receivedChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receivedChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };

  const updateRoom = ({ count }) => {
    setCount(count);
  };

  const onOffer = ({ offer }) => {
    setConnected(true);

    connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => connection.createAnswer())
      .then((answer) => connection.setLocalDescription(answer))
      .then(() =>
        send({ type: "answer", answer: connection.localDescription, room })
      )
      .catch((e) => {
        console.log({ e });
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has ocurred.
          </SweetAlert>
        );
      });
  };

  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const handleEnter = () => {
    setLoggingIn(true);
    send({
      type: "enter",
      room,
    });
  };

  const sendMessage = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name: "User" };
    updateMessages(text);
    channel.send(JSON.stringify(text));
    setMessage("");
  };

  const handleDataChannelMessageReceived = ({ data }) => {
    const text = JSON.parse(data);
    updateMessages(text);
  };

  const updateMessages = (text) => {
    const { name } = text;
    let nameMessages = messages[name];
    if (messages[name]) {
      nameMessages = [...nameMessages, text];
      let newMessages = Object.assign({}, messages, {
        [name]: nameMessages,
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      nameMessages = Object.assign({}, messages, {
        [name]: [text],
      });
      messagesRef.current = nameMessages;
      setMessages(nameMessages);
    }
  };

  return (
    <div className="App">
      {alert}
      <Header as="h2" icon textAlign="center">
        <Icon name="users" />
        Simple WebRTC Chat App
      </Header>
      {(socketOpened && (
        <Fragment>
          <Grid centered columns={4}>
            <Grid.Column>
              {(!isLoggedIn && (
                <Input
                  fluid
                  disabled={loggingIn}
                  type="text"
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Room..."
                  action
                >
                  <input />
                  <Button
                    color="teal"
                    disabled={!room || loggingIn}
                    onClick={handleEnter}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Input>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In the Room: {room}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            {isLoggedIn && room && (
              <Grid.Column width={5}>
                <Segment placeholder>
                  <Header icon>
                    <Icon name="user" />
                    Number of users in the room: {count}
                  </Header>
                </Segment>
                <Segment>{connected ? "Connected" : "Disconnected"}</Segment>
              </Grid.Column>
            )}
            <MessageBox
              messages={messages}
              connectedTo="Admin"
              message={message}
              setMessage={setMessage}
              sendMessage={sendMessage}
              name="User"
            />
          </Grid>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Loading
        </Loader>
      )}
    </div>
  );
};

export default User;
