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

export class GoogleTranslator implements MTEngine {

    apiKey: string;
    srcLang: string;
    tgtLang: string;

    constructor(apiKey: string) {
        // Google is not reporting language codes for base model, only for nmt
        // Using the nmt model for now
        this.apiKey = apiKey;
    }

    getName(): string {
        return 'Google Cloud Translation';
    }

    getShortName(): string {
        return 'Google';
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
        let url = 'https://www.googleapis.com/language/translate/v2?key=' + this.apiKey + '&q=' + encodeURIComponent(source)
            + "&source=" + this.srcLang + "&target=" + this.tgtLang + "&model=nmt";
        return new Promise<string>((resolve, reject) => {
            fetch(url, {
                method: 'GET'
            }).then(async (response: Response) => {
                if (response.ok) {
                    let json = await response.json();
                    let data: any = json.data;
                    let translations: any[] = data.translations;
                    let transation = this.removeEntities(translations[0].translatedText);
                    resolve(transation);
                } else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getLanguages(): Promise<string[]> {
        let url = 'https://translation.googleapis.com/language/translate/v2/languages?key=' + this.apiKey + "&model=nmt";
        return new Promise<string[]>((resolve, reject) => {
            fetch(url, {
                method: 'GET'
            }).then(async (response: Response) => {
                if (response.ok) {
                    let json = await response.json();
                    let data: any = json.data;
                    let array: any[] = data.languages;
                    let languages: string[] = [];
                    for (let lang of array) {
                        languages.push(lang.language);
                    }
                    resolve(languages);
                } else {
                    reject(new Error(response.statusText));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    removeEntities(text: string): string {
        let result: string = text;
        const pattern: RegExp = /&#[\d]+;/g;
        let m: RegExpExecArray | null = pattern.exec(result);
        while (m !== null) {
            const from: number = m.index;
            const to: number = pattern.lastIndex;
            const start: string = result.substring(0, from);
            const entity: string = result.substring(from + 2, to - 1);
            const rest: string = result.substring(to);
            result = start + String.fromCodePoint(parseInt(entity)) + rest;
            m = pattern.exec(result);
        }
        return result;
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
       return Promise.reject(new Error('fixMatch not implemented for Google Cloud Translation'));
    }

    fixesTags(): boolean {
        return false;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        return Promise.reject(new Error('fixTags not implemented for Google Cloud Translation'));
    }
}