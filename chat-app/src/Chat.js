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
import Users from "./Users";
import MessageBox from "./MessageBox";

const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }],
};

const Chat = ({ connection, updateConnection, channel, updateChannel }) => {
  const webSocket = useRef(null);
  const [socketOpened, setSocketOpened] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [alert, setAlert] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState("");
  const connectedRef = useRef();
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
        case "login":
          onLogin(data);
          break;
        case "updateUsers":
          updateUsers(data);
          break;
        case "removeUser":
          removeUser(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "answer":
          onAnswer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          break;
      }
    }
  }, [socketMessages]);

  const onLogin = ({ success, message, users: loggedIn }) => {
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
      setUsers(loggedIn);
      let localConnection = new RTCPeerConnection(configuration);
      // When the browser finds an ice candidate we send it to the other peer
      localConnection.onicecandidate = ({ candidate }) => {
        let connectedTo = connectedRef.current;

        if (candidate && !!connectedTo) {
          send({
            name: connectedTo,
            type: "candidate",
            candidate,
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

  const onOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;

    connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => connection.createAnswer())
      .then((answer) => connection.setLocalDescription(answer))
      .then(() =>
        send({ type: "answer", answer: connection.localDescription, name })
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

  const onAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const send = (data) => {
    webSocket.current.send(JSON.stringify(data));
  };

  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name,
    });
  };

  const handleConnection = (name) => {
    let dataChannel = connection.createDataChannel("messenger");
    dataChannel.onerror = (error) => {
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
    };
    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);

    connection
      .createOffer()
      .then((offer) => connection.setLocalDescription(offer))
      .then(() =>
        send({
          type: "offer",
          offer: connection.localDescription,
          name,
        })
      )
      .catch((e) =>
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
        )
      );
  };

  const handleDataChannelMessageReceived = ({ data }) => {
    const message = JSON.parse(data);
    const { name: user } = message;
    let messages = messagesRef.current ? messagesRef.current : {};
    let userMessages = messages[user];
    if (userMessages) {
      userMessages = [...userMessages, message];
      let newMessages = Object.assign({}, messages, { [user]: userMessages });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      let newMessages = Object.assign({}, messages, { [user]: [message] });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    }
  };

  const toggleConnection = (userName) => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = "";
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnecting(userName);
      connectedRef.current = userName;
      handleConnection(userName);
      setConnecting(false);
    }
  };

  const sendMessage = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name };
    let messages = messagesRef.current ? messagesRef.current : {};
    let connectedTo = connectedRef.current;
    let userMessages = messages[connectedTo];
    if (messages[connectedTo]) {
      userMessages = [...userMessages, text];
      let newMessages = Object.assign({}, messages, {
        [connectedTo]: userMessages,
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      userMessages = Object.assign({}, messages, {
        [connectedTo]: [text],
      });
      messagesRef.current = userMessages;
      setMessages(userMessages);
    }
    channel.send(JSON.stringify(text));
    setMessage("");
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const updateUsers = ({ user }) => {
    setUsers((prev) => [...prev, user]);
  };

  const removeUser = ({ user }) => {
    setUsers((prev) => prev.filter((u) => u.userName !== user.userName));
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Username..."
                  action
                >
                  <input />
                  <Button
                    color="teal"
                    disabled={!name || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Input>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In as: {name}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            <Users
              users={users}
              toggleConnection={toggleConnection}
              connectedTo={connectedTo}
              connecting={connecting}
            />
            <MessageBox
              messages={messages}
              connectedTo={connectedTo}
              message={message}
              setMessage={setMessage}
              sendMessage={sendMessage}
              name={name}
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

export default Chat;
