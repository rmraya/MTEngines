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

import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { Constants } from "./Constants";
import { MTUtils } from "./MTUtils";


export class ModernMTTranslator implements MTEngine {

    apiKey: string;
    srcLang: string;
    tgtLang: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    getName(): string {
        return 'ModernMT';
    }

    getShortName(): string {
        return 'ModernMT';
    }

    getLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fetch('https://api.modernmt.com/translate/languages').then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        if (json.status == 200) {
                            let data: string[] = json.data;
                            resolve(data.sort());
                        } else {
                            reject(json.error.message);
                        }
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
        let json: any = {
            "source": this.srcLang,
            "target": this.tgtLang,
            "q": source
        };
        let params: string = JSON.stringify(json);
        return new Promise<string>((resolve, reject) => {
            fetch('https://api.modernmt.com/translate', {
                method: 'POST',
                headers: [
                    ['MMT-ApiKey', this.apiKey],
                    ['X-HTTP-Method-Override', 'GET'],
                    ['Content-Type', 'application/json'],
                    ['Content-Length', '' + params.length]
                ],
                body: params
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        if (json.status === 200) {
                            resolve(json.data.translation);
                        } else {
                            reject(json.error.message);
                        }
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