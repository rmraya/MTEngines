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

export class YandexTranslator implements MTEngine {

    apiKey: string;
    srcLang: string;
    tgtLang: string;

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
        return new Promise((resolve, reject) => {
            this.getLanguagePairs().then((pairs: string[]) => {
                let languages: string[] = [];
                for (let pair of pairs) {
                    let lang = pair.split('-')[0];
                    if (languages.indexOf(lang) == -1) {
                        languages.push(lang);
                    }
                }
                resolve(languages.sort());
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    getTargetLanguages(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.getLanguagePairs().then((pairs: string[]) => {
                let languages: string[] = [];
                for (let pair of pairs) {
                    let lang = pair.split('-')[1];
                    if (languages.indexOf(lang) == -1) {
                        languages.push(lang);
                    }
                }
                resolve(languages.sort());
            }).catch((error: any) => {
                reject(error);
            });
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
        let url = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=' + this.apiKey + '&text=' + encodeURIComponent(source) + "&lang=" + this.srcLang + "-" + this.tgtLang;
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'GET'
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let translation = json.text[0];
                        resolve(translation);
                    });
                } else {
                    reject(response.statusText);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    getLanguagePairs(): Promise<string[]> {
        let url = 'https://translate.yandex.net/api/v1.5/tr.json/getLangs?key=' + this.apiKey + '&ui=en';
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let pairs: string[] = json.dirs;
                        resolve(pairs);
                    });
                } else {
                    reject(response.statusText);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }
}