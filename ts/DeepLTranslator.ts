/*******************************************************************************
 * Copyright (c) 2023 - 2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { LanguageUtils } from "typesbcp47";
import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";
import { Constants } from "./Constants";

export class DeepLTranslator implements MTEngine {

    srcLang: string;
    tgtLang: string;
    apiKey: string;
    proPlan: boolean;
    translateUrl: string;
    languageUrl: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.proPlan = !apiKey.endsWith(':fx');
        this.translateUrl = this.proPlan ? "https://api.deepl.com/v1/translate" : "https://api-free.deepl.com/v2/translate";
        this.languageUrl = this.proPlan ? "https://api.deepl.com/v1/languages?type="
            : "https://api-free.deepl.com/v2/languages?type=";
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
        let params: string = "&text=" + encodeURIComponent(source) + "&source_lang=" + this.srcLang.toUpperCase() + "&target_lang=" + this.tgtLang.toUpperCase();
        return new Promise<string>((resolve, reject) => {
            fetch(this.translateUrl, {
                method: 'POST',
                headers: [
                    ['Authorization', 'DeepL-Auth-Key ' + this.apiKey],
                    ['User-Agent', Constants.TOOL + ' ' + Constants.VERSION],
                    ['Content-Type', 'application/x-www-form-urlencoded'],
                    ['Accept', 'application/json'],
                    ['Content-Length', params.length.toString()]
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
            fetch(this.languageUrl + type, {
                method: 'GET',
                headers: [
                    ['Authorization', 'DeepL-Auth-Key ' + this.apiKey]
                ]
            }).then((response: Response) => {
                if (response.status === 200) {
                    response.json().then((json: any) => {
                        let languages: string[] = [];
                        for (let language of json) {
                            languages.push(LanguageUtils.normalizeCode(language.language));
                        }
                        resolve(languages);
                    }).catch((error: any) => {
                        reject(error);
                    });
                } else {
                    reject(response.status + ': ' + response.statusText);
                }
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement): Promise<MTMatch> {
        return new Promise<MTMatch>((resolve, reject) => {
            this.translate(MTUtils.getElementContent(source)).then((translation: string) => {
                let target: XMLElement = MTUtils.toXMLElement('<target>' + translation + '</target>');
                if (source.hasAttribute('xml:space')) {
                    target.setAttribute(source.getAttribute('xml:space'));
                }
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return true;
    }
}