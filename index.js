const pull = require('pull-stream');
const Scroller = require('pull-scroll')

// TODO: hings
module.exports = (sbot, config) => {

  // The root message that all the chat messages are linked back to
  const rootMessageId = config.rootMessageId;

  // The chat root message type to identify chat messages that are linked
  // to the root and send chat messages
  const chatMessageType = config.chatMessageType;

  // The field name of the JSON key containing the message text.
  const chatMessageField = config.chatMessageField;

  function messagesSource() {
    var linksFromRootMessage = sbot.links({
      dest: rootMessageId,
      live: true
    });

    var typeFilter = pull.filter(msg => msg.value.content.type === chatMessageType);

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
      Scroller(scroller,
        msg.value.content[chatMessageField], (msg) => renderChatMessage(msg, msg.value.author)
      ));

    return scroller;
  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText, linkToMessageIds, cb) {
    var content = {
      type: chatMessageType
    };

    content[chatMessageField] = messageText;

    sbot.publish(content, cb);
  }

  return {
    getScrollerElement: getScrollerElement,
    sendMessage: sendMessage
  }
}
