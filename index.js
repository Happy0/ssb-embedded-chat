const pullCat = require('pull-cat');
const h = require('hyperscript');
const pull = require('pull-stream');
const Scroller = require('pull-scroll');
const NameCache = require('./name-cache');
const Abortable = require('pull-abortable');

module.exports = (config) => {

  // A function to get the stream of chat messages by ID (getChatStream(id, live))).
  // Stream should not have other messages types
  const getChatStream = config.getChatStream

  // Optionally display some of the old messages from a previous conversation by ID.
  // e.g. if this is a rematch from a previous game of something
  const previousChatId = config.previousChatId;

  // publishPublic(content, cb)
  const publishPublic = config.publishPublic

  // publishPrivate(content, participants, cb) 
  const publishPrivate = config.publishPrivate

  // A stream of user IDs who have changed their name (aboutSelfChangeStream(since))
  const aboutSelfChangeStream = config.aboutSelfChangeStream

  // The root message that all the chat messages are linked back to
  const rootMessageId = config.rootMessageId;

  // The 'type' field value that chat messages have to send chat messages with
  const chatMessageType = config.chatMessageType;

  // The field name of the JSON key containing the message text.
  const chatMessageField = config.chatMessageField;

  // Whether the user should be able to send messages in the chat box
  // or not
  const chatboxEnabled = config.chatboxEnabled;

  // Whether the messages sent should be encrypted and sent to users in
  // participant array or not
  const isPublic = config.isPublic;

  /*
   * The idents of those who should be able to see the chat message and their
   * display names. An array of ID strings for the user ids.
  }
   */
  const participants = config.participants;

  /**
   * The user of this library needs to pass in a way to get the display name for a given
   * scuttlebutt identity. This is to avoid depending on any particular plugin
   * for indexing names, etc.
   */
  const getDisplayName = config.getDisplayName;

  if (!getDisplayName || typeof(getDisplayName) != "function")
  {
    throw new Error("ssb-embedded-chat requires a getDisplayName errback which calls back with a user's display name.")
  }

  const nameCache = NameCache(aboutSelfChangeStream, getDisplayName);

  const aborter = Abortable();

  function messagesSource() {
    var linksFromRootMessage = getChatStream(rootMessageId, true);

    var typeFilter = pull.filter(msg => {
      return !msg.sync && msg.value.content.type === chatMessageType
    });

    var privateOnlyFilter = pull.filter(msg =>
      isPublic || participants.indexOf(msg.value.author) !== -1
    )

    var previousChatMessages = !previousChatId ? pull.empty() : getChatStream(previousChatId, false);

    var oldChatStream = pull(previousChatMessages, pull(typeFilter, privateOnlyFilter), pull.map(msg => {
      msg.isOld = true;
      return msg;
    }))


    var newChatStream = pull(linksFromRootMessage, typeFilter, privateOnlyFilter);

    return pullCat([oldChatStream, newChatStream]);
  }

  function renderChatMessage(msg, author, isOld) {
    var containerClass = isOld ? 'ssb-embedded-chat-message ssb-embedded-chat-message-old' : 'ssb-embedded-chat-message'

    return h('div', {
      className: containerClass
    },
    h('span', '<'),
    h('span', {className: 'ssb-embedded-chat-message-author'}, author),
    h('span', '> '),
    h('span', { className: 'ssb-embedded-chat-message-text' },  msg))
  }

  /**
   * Return the scroller HTML DOM element that the consuming code
   * can attach to the DOM somewhere.
   */
  function getChatboxElement() {
    var content = h('div', {

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
      },
      className: 'ssb-embedded-chat-messages'
    }, content);

    pull(
      messagesSource(),
      aborter,
      pull.asyncMap(getNameAndChatMessage),
      Scroller(scroller,
        content,
        (details) =>
        renderChatMessage(details.message, details.displayName, details.isOld), false, true)
      );

    var chatBox = h('div', {
      className: 'ssb-embedded-chat',
    }, scroller, sendMessageBox)

    return chatBox;
  }

  function getNameAndChatMessage(msg, cb) {
    const message = msg.value.content[chatMessageField];
    const authorId = msg.value.author;

    nameCache.getDisplayName(authorId, (err, res) => cb(null, {
      displayName: res,
      message,
      isOld: msg.isOld
    }));
  }

  /* Send the message using the configured message type and root message.
   *  Additionally, link the message to each of the given ids.
   */
  function sendMessage(messageText) {
    var content = {
      type: chatMessageType,
      root: rootMessageId
    };

    if ( !isPublic && (!participants || participants.length === 0) ) {
      console.error("Chatbox: participants array must be configured or the chat must be configured as public.")
      return;
    }

    content[chatMessageField] = messageText;

    if (isPublic) {
      publishPublic(content, (err, msg) => {
        if (err) {
          console.log("Error publishing public chat message " + err);
        }

      })
    } else {
      publishPrivate(content, participants, (err, msg) => {
        if (err) {
          console.log("Error publishing private chat message " + err);
        }
      });
    }
  }

  return {
    getChatboxElement: getChatboxElement,

    /**
     * Ends the live message feed arriving into the chat. Does not remove the
     * DOM element
     */
    destroy: () => {
      aborter.abort()
    }
  }
}
