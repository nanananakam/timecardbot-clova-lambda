const clova = require("@line/clova-cek-sdk-nodejs");
const line = require('@line/bot-sdk');
const util = require('util');

const clovaSkillHandler = clova.Client
  .configureSkill()
  .onLaunchRequest(responseHelper => {
    responseHelper.setSimpleSpeech(
      clova.SpeechBuilder.createSpeechText(`タイムカードです。出勤、退勤から選んでください。`)
    );
  })
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    const userId = responseHelper.getUser().userId;
    const client = new line.Client({
      channelAccessToken: process.env["channelAccessToken"]
    });
    const now = new Date();
    let message = {
      "type":"text",
      "text":""
    };

    switch (intent) {
      case "PunchInIntent":
        message.text = "出勤 " + now.toLocaleDateString("ja-JP") + " " + now.toLocaleTimeString("ja-JP");
        await client.pushMessage(userId, message)
          .catch( err => {
            console.log("-- err ---");
            console.log(util.inspect(err), false, null);
          });
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`出勤記録しました。`)
        );
        responseHelper.endSession();
        break;
      case "PunchOutIntent":
        message.text = "退勤 " + now.toLocaleDateString("ja-JP") + " " + now.toLocaleTimeString("ja-JP");
        await client.pushMessage(userId, "退勤")
          .catch( err => {
            console.log("-- err ---");
            console.log(util.inspect(err), false, null);
          });
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`退勤記録しました。`)
        );
        responseHelper.endSession();
        break;
      default:
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`聞き取れませんでした。`)
        );
        break;
    }
  })
  .onSessionEndedRequest(responseHelper => {
    responseHelper.endSession();
  })

exports.handler = async (event, content) => {
  console.log("--- event ---");
  console.log(util.inspect(event), false, null);

  const signature = event.headers.signaturecek || event.headers.SignatureCEK;
  const applicationId = process.env["applicationId"];
  const requestBody = event.body;
  // 検証
  // リクエストが自分の作成したスキルからであるか等を確認しています。
  await clova.verifier(signature, applicationId, requestBody);
  console.log("clear verifier");

  var ctx = new clova.Context(JSON.parse(event.body));
  const requestType = ctx.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  if (requestHandler) {
    await requestHandler.call(ctx, ctx);

    // CEKに返すレスポンスです。
    // API Gatewayの設定で「Lambdaのプロキシ結合の使用」のチェックを入れた場合、
    // レスポンスにヘッダー等を入れる必要がある
    const response =  {
      "isBase64Encoded": false,
      "statusCode": 200,
      "headers": {},
      "body": JSON.stringify(ctx.responseObject),
    }

    console.log(util.inspect(response), false, null);

    return response;
  } else {
    throw new Error(`Unable to find requestHandler for "${requestType}"`);
  }
}