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

  /* The idents of those who should be able to see the chat message in the format
   * documented in https://ssbc.github.io/docs/scuttlebot/howto-publish-encrypted-messages.html
   * for the message recipients */
  const recipients = config.recipients;

  function messagesSource() {
    var linksFromRootMessage = sbot.links({
      dest: rootMessageId,
      values: true,
      live: true
    });

    var canSeeMessageFilter = pull.filter(msg =>{
      if (msg.sync) return;

      return !msg.sync &&
      msg.value &&
      typeof msg.value.content === 'string' &&
      sbot.private.unbox(msg)
    });

    var unboxedMessageMap = pull.map(msg => msg = sbot.private.unbox(msg));
    var unboxedMessagesThrough = pull(canSeeMessageFilter, unboxedMessageMap);

    var typeFilter = pull.filter(msg => !msg.sync && msg.value.content.type === chatMessageType);

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
    var content = h('div');

    var keyPressHandler = (e) => {
      if (e.charCode === 13) {
        var messageText = e.srcElement.value;

        if (messageText.length > 0) {
          e.srcElement.value="";
          sendMessage(messageText);
        }

      }
    }

    var sendMessageBox = h('input', {
      onkeypress: keyPressHandler,
      className: 'ssb-embedded-chat-input-box'
    });

    var scroller = h('div', {
      className: 'ssb-embedded-chat-message',
      style: {
        'overflow-y': 'scroll'
      }
    }, content, sendMessageBox);

    pull(
      messagesSource(),
      Scroller(scroller, content, (msg) => renderChatMessage(msg.value.content[chatMessageField], msg.value.author)));

    return scroller;
  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText) {
    var content = {
      type: chatMessageType,
    };

    if (!recipients || recipients.length === 0) {
      console.error("Chatbox: Recipients array must be configured.")
      return;
    }

    content[chatMessageField] = messageText;

    sbot.private.publish(content, recipients, (err, msg) => {
      console.log("sending msg");
      console.log(err);
      console.log(msg);
    });
  }

  return {
    getChatboxElement: getChatboxElement
  }
}
