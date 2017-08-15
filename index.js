const pull = require('pull-stream');
const Scroller = require('pull-scroll')

// TODO: maist hings
module.exports = (sbot, config) => {

  // The root message that all the chat messages are linked back to
  const rootMessageId = config.rootMessageId;

  // The chat root message type to identify chat messages that are linked
  // to the root and send me chat messages
  const chatMessageType = config.chatMessageType;

  /**
   * Return the scroller HTML DOM element that the consuming code
   * can attach to the DOM somewhere.
   */
  function getScrollerElement() {

  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText, linkToMessageIds) {

  }

  return {
    getScrollerElement: getScrollerElement,
    sendMessage: sendMessage
  }
}
