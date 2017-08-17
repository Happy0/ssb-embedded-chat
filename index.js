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

  // The identity of the viewer
  const myIdent = config.myIdent;

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

    var typeFilter = pull.filter(msg => !msg.sync && msg.value.content.type === chatMessageType);

    return pull(linksFromRootMessage, typeFilter);
  }

  function renderChatMessage(msg, author) {
    return h('div', author + ": " + msg);
  }

  /**
   * Return the scroller HTML DOM element that the consuming code
   * can attach to the DOM somewhere.
   */
  function getScrollerElement() {
    var content = h('div');

    var scroller = h('div', {
      class: 'ssb-embedded-chat-message',
      style: {
        'overflow-y': 'scroll'
      }
    }, content);

    pull(
      messagesSource(),
      Scroller(scroller, (msg) => renderChatMessage(msg.value.content[chatMessageField], msg.value.author)));

    return scroller;
  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText, linkToMessageIds, cb) {
    var content = {
      type: chatMessageType,
      recps: recipients
    };

    content[chatMessageField] = messageText;

    sbot.private.publish(content, cb);
  }

  return {
    getScrollerElement: getScrollerElement
  }
}
