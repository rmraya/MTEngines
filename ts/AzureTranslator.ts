/*******************************************************************************
 * Copyright (c) 2023-2026 Maxprograms.
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
import { MTEngine } from "./MTEngine.js";
import { MTMatch } from "./MTMatch.js";
import { MTUtils } from "./MTUtils.js";

export class AzureTranslator implements MTEngine {

    srcLang: string = '';
    tgtLang: string = '';
    apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    getName(): string {
        return 'Azure Translator Text';
    }

    getShortName(): string {
        return 'Azure';
    }

    getSourceLanguages(): Promise<string[]> {
        return this.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return this.getLanguages();
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
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let url: string = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=' + this.srcLang + '&to=' + this.tgtLang;
        let params: any = [{
            "Text": source
        }];
        let data: string = JSON.stringify(params);
        return new Promise<string>((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                headers: [
                    ['Ocp-Apim-Subscription-Key', this.apiKey],
                    ['Content-Type', 'application/json; charset=UTF-8']
                ],
                body: data
            }).then(async (response: Response) => {
                if (response.ok) {
                    let json: any = await response.json();
                    let array: any[] = json[0].translations;
                    let translation: string = array[0].text;
                    resolve(translation);
                } else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation'
            ).then(async (response: Response) => {
                if (response.ok) {
                    let json: any = await response.json();
                    let translation: any = json.translation;
                    resolve(Object.keys(translation));
                } else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement, terms: { source: string, target: string }[]): Promise<MTMatch> {
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

    fixesMatches(): boolean {
        return false;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        return Promise.reject(new Error('fixMatch not implemented for Azure Translator'));
    }

    fixesTags(): boolean {
        return false;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        return Promise.reject(new Error('fixTags not implemented for Azure Translator'));
    }
}
