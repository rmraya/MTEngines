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

import { XMLAttribute, XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine.js";
import { MTMatch } from "./MTMatch.js";
import { MTUtils } from "./MTUtils.js";


export class ModernMTTranslator implements MTEngine {

    apiKey: string;
    srcLang: string = '';
    tgtLang: string = '';

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
            fetch('https://api.modernmt.com/translate/languages').then(async (response: Response) => {
                if (response.ok) {
                    let json = await response.json();
                    if (json.status == 200) {
                        let data: string[] = json.data;
                        data.sort(new Intl.Collator('en').compare);
                        resolve(data);
                    } else {
                        reject(new Error(json.error.message));
                    }
                } else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
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
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
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
                    ['Content-Type', 'application/json']
                ],
                body: params
            }).then(async (response: Response) => {
                if (response.ok) {
                    let json = await response.json();
                    if (json.status === 200) {
                        resolve(json.data.translation);
                    } else {
                        reject(new Error(json.error.message));
                    }
                    resolve(json.translations[0].text);
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
            this.translate(MTUtils.getElementContent(source)).then((translation: string) => {
                let target: XMLElement = MTUtils.toXMLElement('<target>' + translation + '</target>');
                let space: XMLAttribute | undefined = source.getAttribute('xml:space');
                if (space) {
                    target.setAttribute(space);
                }
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
        return false;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        return Promise.reject(new Error('fixMatch not implemented for ModernMT'));
    }

    fixesTags(): boolean {
        return false;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        return Promise.reject(new Error('fixTags not implemented for ModernMT'));
    }
}