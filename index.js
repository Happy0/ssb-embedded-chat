const h = require('hyperscript');
const pull = require('pull-stream');
const Scroller = require('pull-scroll');

// TODO: hings
module.exports = (sbot, config) => {

  // The root message that all the chat messages are linked back to
  const rootMessageId = config.rootMessageId;

  // The chat root message type to identify chat messages that are linked
  // to the root and send chat messages
  const chatMessageType = config.chatMessageType;

  // The field name of the JSON key containing the message text.
  const chatMessageField = config.chatMessageField;

  // Whether the user should be able to send messages in the chat box
  // or not
  const chatboxEnabled = config.chatboxEnabled;

  /* The idents of those who should be able to see the chat message and their
   * display names. Of format:
   [
    {
      "name": "display name",
      "id": <scuttlebut ident>
    }
  ]
   */
  const recipients = config.recipients;

  function messagesSource() {
    var linksFromRootMessage = sbot.links({
      dest: rootMessageId,
      values: true,
      live: true
    });

    var encryptedMessagesOnlyThrough = pull.filter(msg => {
      if (msg.sync) return false;

      return typeof(msg.value.content) === 'string';
    });

    var unboxedMessageMap = pull.asyncMap((msg, cb) => sbot.private.unbox(msg.value.content, (err, data) => {
      if (data) {
        msg.value.content = data;
        cb(null, msg);
      } else {
        msg.value.content = {};
        cb(null, msg);
      }
    }));
    var unboxedMessagesThrough = pull(encryptedMessagesOnlyThrough, unboxedMessageMap);

    var typeFilter = pull.filter(msg => {
      return !msg.sync && msg.value.content.type === chatMessageType
    });

    return pull(linksFromRootMessage, pull(unboxedMessagesThrough, typeFilter));
  }

  function renderChatMessage(msg, author) {
    return h('div', {
      className: 'ssb-embedded-chat-message'
    }, `<${author}> ${msg}`);
  }

  /**
   * Return the scroller HTML DOM element that the consuming code
   * can attach to the DOM somewhere.
   */
  function getChatboxElement() {
    var content = h('div', {
      className: 'ssb-embedded-chat-messages'
    });

    var keyPressHandler = (e) => {
      if (e.charCode === 13) {
        var messageText = e.srcElement.value;

        if (messageText.length > 0) {
          e.srcElement.value = "";
          sendMessage(messageText);
        }

      }
    }

    var sendMessageBox = h('input', {
      onkeypress: keyPressHandler,
      className: 'ssb-embedded-chat-input-box',
      disabled: !chatboxEnabled
    });

    var scroller = h('div', {
      style: {
        'overflow-y': 'auto',
        'overflow-x': 'hidden'
      }
    }, content);

    pull(
      messagesSource(),
      Scroller(scroller,
        content,
        (msg) => renderChatMessage(msg.value.content[chatMessageField], recipients[msg.value.author].name), false, true));

    var chatBox = h('div', {
      className: 'ssb-embedded-chat',
    }, scroller, sendMessageBox)

    return chatBox;
  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText) {
    var content = {
      type: chatMessageType,
      root: rootMessageId
    };

    if (!recipients || recipients.length === 0) {
      console.error("Chatbox: Recipients array must be configured.")
      return;
    }

    content[chatMessageField] = messageText;

    sbot.private.publish(content, Object.keys(recipients), (err, msg) => {

    });
  }

  return {
    getChatboxElement: getChatboxElement
  }
}
