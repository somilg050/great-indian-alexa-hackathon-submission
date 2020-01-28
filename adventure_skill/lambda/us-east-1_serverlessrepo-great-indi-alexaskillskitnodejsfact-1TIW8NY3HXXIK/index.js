/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const Script = require('./Script.js');
const { RhymeData, OtherAudio, CountryRelated } = require('./Audio_URLS.js');

var RandomInt = (min, max) => {
		return Math.floor(Math.random()*(max-min+1)+min);
	};
	
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = `Hello Friends! Look who we have on board. We have Appu 
    with us! Would you like to sing a rhyme along with appu, or would you like to
    explore a country with appu.`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const PlayRhymeIntent = {
  canHandle(handlerInput) {
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var State = "nothing";
    if(SessionAttributes.hasOwnProperty("State")){
      State = SessionAttributes.State;
    }
    // check if the user said yes or no for the suggested rhyme or PlayRhymeIntent
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'PlayRhymeIntent' 
      || ((handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
      || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent' 
      ) && State === 'suggested a rhyme'));
  },
  handle(handlerInput) {
    var request = handlerInput.requestEnvelope.request;
    var Keys = Object.keys(RhymeData);
    var Size = Keys.length;
    var choice = Keys[RandomInt(0, Size-1)]; 
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var speechText = '';
    var endSession = false;

    if(request.intent.name === 'AMAZON.YesIntent') {
      choice = SessionAttributes.SuggestedRhyme;
      speechText = `here is ${choice} <audio src="${RhymeData[choice]}"/> that's it for today! see you again tomorrow. bye`;
      handlerInput.attributesManager.setSessionAttributes({});
      endSession = true;
      return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(endSession)
      .getResponse();

    }else if(request.intent.name === 'AMAZON.NoIntent') {
      if(SessionAttributes.SuggestedRhymeCount <= 2){
        var index = Keys.findIndex((element)=>{return element === SessionAttributes.SuggestedRhyme})+1;
        choice = Keys[index%Size];
        speechText = `then do you want to try ${choice}`;
        SessionAttributes.SuggestedRhyme = choice;
        SessionAttributes.SuggestedRhymeCount++;
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
      }else{
        speechText = "Ok looks like I can't please you, so I give up. bye";
        handlerInput.attributesManager.setSessionAttributes({});
        endSession = true;
      }
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(endSession)
      .getResponse();
    }
    
    //check if a slot value exists
    if(request.intent.hasOwnProperty("slots") 
      && request.intent.slots.rhyme.hasOwnProperty("resolutions")){
        
      var name = request.intent.slots.rhyme.resolutions;
      //check if it was mapped to any rhyme
      if(name.resolutionsPerAuthority[0].hasOwnProperty("values")){
        name = name.resolutionsPerAuthority[0].values[0].value.name;
        
        if(name == 'random'){
          speechText = `Let's see where the magic wheel lands us <audio src="${OtherAudio.magic_wheel}"/>`;
          speechText += `here is ${choice} <audio src="${RhymeData[choice]}"/> that's it for today! see you again tomorrow. bye`;
        }else{
          speechText = `here is ${name} <audio src="${RhymeData[name]}"/> that's it for today! see you again tomorrow. bye`;
        }
        endSession = true;
      }else{
        name = request.intent.slots.rhyme.value;
        speechText = `Sorry appu doesn't know how to sing ${name}. do you want to try ${choice}`;
        SessionAttributes.SuggestedRhyme = choice;
        SessionAttributes.SuggestedRhymeCount = 1;
        SessionAttributes.State = "suggested a rhyme";
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
      }
    }
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(endSession)
      .getResponse();
  },
};

const ExploreWorldIntent = {
  canHandle(handlerInput) {
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var cond = false;
    if(SessionAttributes.hasOwnProperty("unfinishedJourney")){
      cond = true;
    }
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'ExploreWorldIntent' 
        || cond);
  },
  async handle(handlerInput) {
    var Keys = Object.keys(Script);
    var Size = Keys.length;
    var request = handlerInput.requestEnvelope.request;
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var RandomCountry = Keys[RandomInt(0, Size-1)];
    var speechText = "";

    if(!SessionAttributes.hasOwnProperty("unfinishedJourney")){
      var PersistenceAttributes = await handlerInput.attributesManager.getPersistentAttributes();
      if(PersistenceAttributes.hasOwnProperty("State")){
        SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        SessionAttributes.unfinishedJourney = true;
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
        speechText = `oh, it looks like you were in middle of a `
        +`journey in ${PersistenceAttributes.Exploring}, would you like to countinue the traveling?`;
        
        return handlerInput.responseBuilder
          .speak(speechText)
          .withShouldEndSession(false)
          .getResponse();
      }
    }else{
      delete SessionAttributes.unfinishedJourney;
      if(request.intent.name === 'AMAZON.YesIntent'){
        SessionAttributes = await handlerInput.attributesManager.getPersistentAttributes();
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
        return ExploringACountry.handle(handlerInput);
      }else if(request.intent.name === 'AMAZON.NoIntent'){
        handlerInput.attributesManager.setPersistentAttributes({});
        await handlerInput.attributesManager.savePersistentAttributes();
      }
    }

    speechText = `Get ready for exploring `
      + `countries with Appu and his friends. `
      + ` <audio src="${CountryRelated.countryIntro}"/> `
      + `Lets spin the magic wheel to see where Appu and his friends are going today?` 
      + ` <audio src="${OtherAudio.magic_wheel}"/>`;

    if(request.intent.hasOwnProperty("slots") 
        &&  request.intent.slots.hasOwnProperty("country")
        && request.intent.slots.country.hasOwnProperty('value')){
      
      var givenCountry = request.intent.slots.country.value;
      givenCountry = givenCountry.toLowerCase();
      var index = Keys.findIndex((ele) => ele === givenCountry);
      console.log(givenCountry);
      if(index == -1){
        speechText = `Oh no appu can't go to ${givenCountry}, but appu can travel to ${RandomCountry} today.` 
        + ` if you want spin the magic wheel to get a different wheel say yes and, if you want to `
        + `countinue with ${RandomCountry} say no`;
      }else{
        SessionAttributes.Exploring = givenCountry;
        SessionAttributes.Scene = 0; 
        SessionAttributes.State = 'ExploringCountry';
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
        return ExploringACountry.handle(handlerInput);
      }
    }else{
      speechText += ` we got ${RandomCountry}, `
      + `Do you want to spin the wheel again?`;
    }

    SessionAttributes.SuggestedCountry = RandomCountry;
    SessionAttributes.State = "SuggestedCountry";
    SessionAttributes.SuggestedCountryCount = 1;
    handlerInput.attributesManager.setSessionAttributes(SessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const ExploringACountry = {
  canHandle(handlerInput) {
    var request = handlerInput.requestEnvelope.request;
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    return request.type === 'IntentRequest' && !(request.intent.name === 'ExploreWorldIntent')
      && (SessionAttributes.State === 'SuggestedCountry' 
      || SessionAttributes.State === 'ExploringCountry');
  },
  async handle(handlerInput) {
    var speechText = '';
    var request = handlerInput.requestEnvelope.request;
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var Country = SessionAttributes.SuggestedCountry;
    var endSession =false;

    if(SessionAttributes.State === 'SuggestedCountry'){
      if(request.intent.name === 'AMAZON.YesIntent'){
        var Keys = Object.keys(Script);
        var Size = Keys.length;
        var index = Keys.findIndex((ele) => ele === Country);
        
        Country = Keys[(index+1)%Size];
        speechText = ` ok then let's spin the wheel again <audio src="${OtherAudio.magic_wheel}"/>`
          +` looks like the wheel decided to take us to ${Country}. Do you want to spin the wheel again?`;
        SessionAttributes.SuggestedCountry = Country;
        SessionAttributes.SuggestedCountryCount += 1;
        
        if(SessionAttributes.SuggestedCountryCount >= 4){
          speechText = `Ok looks like I can't please you, so I give up, appu says bye`;
        }
        
        return handlerInput.responseBuilder
        .speak(speechText)
        .withShouldEndSession(endSession)
        .getResponse();

      }else if(request.intent.name === 'AMAZON.NoIntent'){
        SessionAttributes = {};
        SessionAttributes.Exploring = Country;
        SessionAttributes.Scene = 0; 
        SessionAttributes.State = 'ExploringCountry';
        handlerInput.attributesManager.setSessionAttributes(SessionAttributes);
      }
    }

    Country = SessionAttributes.Exploring;
    var Scene = SessionAttributes.Scene;
    var resp;
    
    if(SessionAttributes.State === 'ExploringCountry'){
      if(Scene != 0){
        speechText = Script[Country][Scene].wrongRes;
        console.log("af "+speechText);
        if(request.intent.hasOwnProperty("slots")
          && request.intent.slots.hasOwnProperty("Answer") 
          && request.intent.slots.Answer.hasOwnProperty("resolutions")){
          console.log('1');
          resp = request.intent.slots.Answer.resolutions;
          resp = resp.resolutionsPerAuthority[0].values[0].value.name;
          if(resp === Script[Country][Scene-1].response){
            console.log('2');
            speechText = Script[Country][Scene].correctRes;
          }
        }else if(Script[Country][Scene-1].response === 'yes' 
          && request.intent.name === 'AMAZON.YesIntent'){
            console.log('3');
          speechText = Script[Country][Scene].correctRes;
        }else if(request.intent.hasOwnProperty("slots")
          &&  request.intent.slots.hasOwnProperty("animal")
          && request.intent.slots.animal.hasOwnProperty("value") 
          && request.intent.slots.animal.value === Script[Country][Scene-1].response){
          speechText = Script[Country][Scene].correctRes;
          console.log('4');
        }
        
        var PersistenceAttributes = {
          State: SessionAttributes.State,
          Scene: SessionAttributes.Scene,
          Exploring: SessionAttributes.Exploring,
        };
        handlerInput.attributesManager.setPersistentAttributes(PersistenceAttributes);
        await handlerInput.attributesManager.savePersistentAttributes();
      }
      console.log(speechText);
      speechText += Script[Country][Scene].dialog;
      SessionAttributes.Scene += 1;
      if(Script[Country][Scene].end){
        speechText += ` That's it for today guys . See you again tomorrow. `
          + `<audio src="${OtherAudio.endingSong}"/>`;
        handlerInput.attributesManager.setSessionAttributes({});
        handlerInput.attributesManager.setPersistentAttributes({});
        await handlerInput.attributesManager.savePersistentAttributes();
        endSession = true;
      }
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(endSession)
      .getResponse();
  },
};

const FallBackHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    var speechText ="Appu quite can't understand what you just said";
    var SessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    if(SessionAttributes.State === 'suggested a rhyme'){
      speechText = `Appu had difficulty understaing by what you said, `
      + `and do you want listen to ${SessionAttributes.SuggestedRhyme} `
      + `or try something else try answering with yes or no`;

    }else if(SessionAttributes.State === 'SuggestedCountry'){
      speechText = `Appu had difficulty understanding by what you said, `
      + ` do you want to go to ${SessionAttributes.SuggestedCountry} `
      + `or try something else. try answering with yes or no `;
    }
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = `Appu says Goodbye! come back later`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder
    .speak(`Appu doesn't feel so good, can you come back later?`)
    .getResponse();
  },
};

const CantUnderstand = {
  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput) {
    const speechText = `Appu quite can't understand what you just said`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession()
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak(`Appu dosn't feel so good can you come back later`)
      .getResponse();
  },
};

function getPersistenceAdapter(tableName) {
  // Not in Alexa Hosted Environment
  return new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: tableName,
    createTable: true
  });
}

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .withPersistenceAdapter(getPersistenceAdapter('Appu_series'))
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayRhymeIntent,
    FallBackHandler,
    ExploreWorldIntent,
    ExploringACountry,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    CantUnderstand
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();