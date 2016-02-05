/// <reference path="localizationManager.ts" />
///<reference path="../../typings/bundledFromTSC.d.ts"/>
import theOneLocalizationManager from './localizationManager';

/*
/// <reference path="../../lib/jquery-1.9.1.js"/>
*/

"use strict";

describe("localizationManager", function () {
   beforeEach(function () {

  });

  it("asyncGetTextInLang does something", function () {
      theOneLocalizationManager.asyncGetTextInLang('theKey','someEnglishWord', 'fr').done(result => {
          expect(result).toBe('someEnglishWord');
      });
  });
});