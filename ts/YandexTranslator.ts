/*******************************************************************************
 * Copyright (c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";

export class YandexTranslator implements MTEngine {

    apiKey: string;
    srcLang: string;
    tgtLang: string;

    // hardcoded because reading pairs from the API times out

    static readonly directions: string[] = ["az-ru", "be-bg", "be-cs", "be-de", "be-en", "be-es", "be-fr", "be-it", "be-pl",
        "be-ro", "be-ru", "be-sr", "be-tr", "bg-be", "bg-ru", "bg-uk", "ca-en", "ca-ru", "cs-be", "cs-en", "cs-ru", "cs-uk",
        "da-en", "da-ru", "de-be", "de-en", "de-es", "de-fr", "de-it", "de-ru", "de-tr", "de-uk", "el-en", "el-ru", "en-be",
        "en-ca", "en-cs", "en-da", "en-de", "en-el", "en-es", "en-et", "en-fi", "en-fr", "en-hu", "en-it", "en-lt", "en-lv",
        "en-mk", "en-nl", "en-no", "en-pt", "en-ru", "en-sk", "en-sl", "en-sq", "en-sv", "en-tr", "en-uk", "es-be", "es-de",
        "es-en", "es-ru", "es-uk", "et-en", "et-ru", "fi-en", "fi-ru", "fr-be", "fr-de", "fr-en", "fr-ru", "fr-uk", "hr-ru",
        "hu-en", "hu-ru", "hy-ru", "it-be", "it-de", "it-en", "it-ru", "it-uk", "lt-en", "lt-ru", "lv-en", "lv-ru", "mk-en",
        "mk-ru", "nl-en", "nl-ru", "no-en", "no-ru", "pl-be", "pl-ru", "pl-uk", "pt-en", "pt-ru", "ro-be", "ro-ru", "ro-uk",
        "ru-az", "ru-be", "ru-bg", "ru-ca", "ru-cs", "ru-da", "ru-de", "ru-el", "ru-en", "ru-es", "ru-et", "ru-fi", "ru-fr",
        "ru-hr", "ru-hu", "ru-hy", "ru-it", "ru-lt", "ru-lv", "ru-mk", "ru-nl", "ru-no", "ru-pl", "ru-pt", "ru-ro", "ru-sk",
        "ru-sl", "ru-sq", "ru-sr", "ru-sv", "ru-tr", "ru-uk", "sk-en", "sk-ru", "sl-en", "sl-ru", "sq-en", "sq-ru", "sr-be",
        "sr-ru", "sr-uk", "sv-en", "sv-ru", "tr-be", "tr-de", "tr-en", "tr-ru", "tr-uk", "uk-bg", "uk-cs", "uk-de", "uk-en",
        "uk-es", "uk-fr", "uk-it", "uk-pl", "uk-ro", "uk-ru", "uk-sr", "uk-tr"];

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    getName(): string {
        return 'Yandex Translate API';
    }

    getShortName(): string {
        return 'Yandex';
    }

    getSourceLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            let languages: string[] = [];
            for (let pair of YandexTranslator.directions) {
                let lang = pair.split('-')[0];
                if (!languages.includes(lang)) {
                    languages.push(lang);
                }
            }
            languages.sort(new Intl.Collator('en').compare);
            resolve(languages);
        });
    }

    getTargetLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            let languages: string[] = [];
            for (let pair of YandexTranslator.directions) {
                let lang = pair.split('-')[1];
                if (!languages.includes(lang)) {
                    languages.push(lang);
                }
            }
            languages.sort(new Intl.Collator('en').compare);
            resolve(languages);
        });
    }

    setSourceLanguage(lang: string): void {
        this.srcLang = lang;
    }

    getSourceLanguage(): string {
        return this.srcLang;
    }

    setTargetLanguage(lang: string): void {
        this.tgtLang = lang;
    }

    getTargetLanguage(): string {
        return this.tgtLang;
    }

    translate(source: string): Promise<string> {
        let params = {
            "texts": [
                source
            ],
            "targetLanguageCode": this.tgtLang,
            "sourceLanguageCode": this.srcLang
        };
        let data = JSON.stringify(params);
        return new Promise((resolve, reject) => {
            fetch("https://translate.api.cloud.yandex.net/translate/v2/translate", {
                method: 'POST',
                headers: [
                    ['Authorization', 'Api-Key ' + this.apiKey],
                    ['Content-Type', 'application/json']
                ],
                body: data
            }).then(async (response) => {
                if (response.ok) {
                    let json = await response.json();
                    resolve(json.translations[0].text);
                }
                else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement): Promise<MTMatch> {
        return new Promise<MTMatch>((resolve, reject) => {
            this.translate(MTUtils.plainText(source)).then((translation: string) => {
                let target: XMLElement = new XMLElement('target');
                target.addString(translation);
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return false;
    }

    static getDirections(): string[] {
        return this.directions;
    }
}
