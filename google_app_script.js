// Define global variables
const SS_ID = 'SPREADSHEET ID';
const ACCESS_TOKEN = 'ACCESS TOKEN IS HERE'
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

const UID = 'USER_ID';

// Define sheet
const ss = SpreadsheetApp.openById(SS_ID);
const sheetname = 'sheetname';
const sheet = ss.getSheetByName(sheetname);

// Define cells
const cell_date = sheet.getRange('A1');
const cell_item = sheet.getRange('A2');


/**
 * Extracts the text message from the JSON data received from the LINE Messaging API.
 *
 * @param {Object} _json - The JSON data received from the LINE Messaging API.
 * @returns {string} The extracted text message.
 */
function getTextFromPostData(_json){
    return _json.events[0].message.text;
}


/**
 * Retrieves the timestamp from the JSON data received from the LINE Messaging API.
 *
 * @param {Object} _json - The JSON data received from the LINE Messaging API.
 * @returns {number} The timestamp in milliseconds.
 */
function getTimestamp(_json){
    return _json.events[0].timestamp;
}


/**
 * Retrieves the reply token from the JSON data received from the LINE Messaging API.
 *
 * @param {Object} _json - The JSON data received from the LINE Messaging API.
 * @returns {string} The reply token.
 */
function getReplyToken(_json){
    return _json.events[0].replyToken
}


/**
 * Converts a timestamp to the string format YYYY/MM/DD.
 *
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} The formatted date string in the format YYYY/MM/DD.
 */
function convertTimestampToYYYYMMDD(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // 0をパディングして2桁にする
    const day = ("0" + date.getDate()).slice(-2); // 0をパディングして2桁にする

    return `${year}/${month}/${day}`;
}


/**
 * Retrieves the first empty cell in a specific column of a sheet.
 *
 * @param {Object} sheet - The sheet object from which to retrieve the empty cell.
 * @param {number} col - The column number where to search for the empty cell.
 * @returns {Object|boolean} The first empty cell in the specified column, or false if not found.
 */
function getFirstEmptyCellInColumn(sheet, col) {
    const range = sheet.getRange(1, col, sheet.getLastRow(), 1);
    const values = range.getValues();

    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === "") {
            const emptyCell = sheet.getRange(i + 1, col);
            return emptyCell;
        }
    }

    return false;
}


/**
 * Sends a reply message to the LINE Messaging API.
 *
 * @param {Object} contents - The contents of the reply message.
 * @returns {void}
 */
function reply(contents){
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + ACCESS_TOKEN
        },
        payload: JSON.stringify(contents) // 送るデータを JSON 形式に変換する
    };
    UrlFetchApp.fetch(LINE_REPLY_URL, options);
}


/**
 * Sends a reply message to the LINE Messaging API with the specified text or message object.
 *
 * @param {string} reply_token - The reply token for identifying the conversation.
 * @param {string} txt - The text of the reply message.
 * @param {Object|boolean} [msg=false] - The message object to send as a reply, or false if not provided.
 * @returns {void}
 */
function replyMessage(reply_token, txt, msg = false){
    let contents;
    if (msg){
        contents = {
            replyToken: reply_token,
            messages: msg,
        };

    }else{
        contents = {
            replyToken: reply_token,
            messages: [{ type: 'text', text: txt }],
        };

    }
    reply(contents);
}


/**
 * Sends a text message to a specific user using the LINE Messaging API.
 *
 * @param {string} txt - The text message to send.
 * @param {string} uid - The user ID of the recipient.
 * @returns {void}
 */
function sendPushMessageToSpecificUser(txt, uid){
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + ACCESS_TOKEN
        },
        payload: JSON.stringify(
            {
                "to": uid,
                "messages":[{
                    "type": "text",
                    "text": txt
                }]
            }
        )
    };
    UrlFetchApp.fetch(LINE_PUSH_URL, options);
}


/**
 * Writes a confirmation message with quick reply options to the specified reply token using the LINE Messaging API.
 *
 * @param {string} reply_token - The reply token for identifying the conversation.
 * @returns {void}
 */
function writeConfirmationQuickReply(reply_token){
    replyMessage(
        reply_token,
        '',
        [{
            'type': 'text',
            'text': 'Do you want to execute the write?',
            'quickReply': {
                'items': [
                    {
                        'type': 'action',
                        'action': {
                            'type': 'message',
                            'label': 'Yes',
                            'text': 'Yes'
                        }
                    },
                    {
                        'type': 'action',
                        'action': {
                            'type': 'message',
                            'label': 'No',
                            'text': 'No'
                        }
                    }
                ]
            }
        }]
    );
    return;
}



/**
 * Handles the POST request received from an external source, processes the message,
 * and sends appropriate replies or performs actions based on the message content.
 * @param {Object} e - The event object containing the POST request data.
 * @returns {void}
 */
function doPost(e){
    const _json = JSON.parse(e.postData.contents);
    const message_txt = getTextFromPostData(_json);
    const reply_token = getReplyToken(_json);

    switch (message_txt) {
        case 'Yes':
            replyMessage(reply_token, 'Writing complete');

            // 通知
            sendPushMessageToSpecificUser('push message text', UID)
            return;

            // 書き込みキャンセル時の処理
        case 'No':
            cell_item.setValue('');
            cell_date.setValue('');
            replyMessage(reply_token, 'Please start over from the beginning.');
            return;

        default:
            cell_item.setValue(message_txt);
            cell_date.setValue(convertTimestampToYYYYMMDD(getTimestamp(_json)));
            writeConfirmationQuickReply(reply_token);
            return;
    }
}
