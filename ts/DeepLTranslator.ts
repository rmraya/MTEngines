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

export class DeepLTranslator implements MTEngine {

    srcLang: string;
    tgtLang: string;
    apiKey: string;
    proPlan: boolean;

    constructor(apiKey: string, proPlan: boolean) {
        this.apiKey = apiKey;
        this.proPlan = proPlan;
    }

    getName(): string {
        return 'DeepL API';
    }

    getShortName(): string {
        return 'DeepL';
    }

    getSourceLanguages(): Promise<string[]> {
        return this.getLanguages('source');
    }

    getTargetLanguages(): Promise<string[]> {
        return this.getLanguages('target');
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
        let url: string = this.proPlan ? 'https://api.deepl.com/v1/translate' : 'https://api-free.deepl.com/v2/translate';
        let params: string = "&text=" + encodeURIComponent(source) + "&source_lang=" + this.srcLang.toUpperCase() + "&target_lang=" + this.tgtLang.toUpperCase();
        return new Promise<string>((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                headers: [
                    ['Authorization', 'DeepL-Auth-Key ' + this.apiKey],
                    ['User-Agent', 'MTEngines 1.0'],
                    ['Content-Type', 'application/x-www-form-urlencoded'],
                    ['Accept', 'application/json'],
                    ['Content-Length', '' + params.length]
                ],
                body: params
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        resolve(json.translations[0].text);
                    }).catch(error => {
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

    getLanguages(type: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let url = this.proPlan ? 'https://api.deepl.com/v2/languages?type=' : 'https://api-free.deepl.com/v2/languages?type=';
            fetch(url + type, {
                method: 'GET',
                headers: [
                    ['Authorization', 'DeepL-Auth-Key ' + this.apiKey]
                ]
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let languages: string[] = [];
                        for (let language of json) {
                            languages.push(this.normalize(language.language));
                        }
                        resolve(languages);
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

    normalize(lang: string): string {
        let index: number = lang.indexOf('-');
        if (index == -1) {
            return lang.toLowerCase();
        }
        return lang.substring(0, index).toLowerCase() + '-' + lang.substring(index + 1).toUpperCase();
    }
}