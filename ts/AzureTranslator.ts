/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { MTEngine } from "./MTEngine";

export class AzureTranslator implements MTEngine {

    srcLang: string;
    tgtLang: string;
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
        let url: string = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=' + this.srcLang + '&to=' + this.tgtLang;
        let params: any = [{
            "Text": source
        }];
        let data: string = JSON.stringify(params);
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                headers: [
                    ['Ocp-Apim-Subscription-Key', this.apiKey],
                    ['Content-Type', 'application/json; charset=UTF-8']
                ],
                body: data
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let array: any[] = json[0].translations;
                        let translation: string = array[0].text;
                        resolve(translation);
                    }).catch((error: any) => {
                        reject(error);
                    });
                } else {
                    reject(response.statusText);
                }
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    getLanguages(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation'
            ).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let translation: any = json.translation;
                        resolve(Object.keys(translation));
                    }).catch((error: any) => {
                        reject(error);
                    });
                } else {
                    reject(response.statusText);
                }
            }).catch((error: any) => {
                reject(error);
            });
        });
    }
}
