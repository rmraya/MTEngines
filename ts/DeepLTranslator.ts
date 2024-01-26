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

import * as deepl from 'deepl-node';
import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";

export class DeepLTranslator implements MTEngine {

    srcLang: string;
    tgtLang: string;
    translator: deepl.Translator;

    constructor(apiKey: string) {
        this.translator = new deepl.Translator(apiKey);
    }

    getName(): string {
        return 'DeepL API';
    }

    getShortName(): string {
        return 'DeepL';
    }

    getSourceLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            this.translator.getSourceLanguages().then((languages: deepl.Language[]) => {
                let codes: string[] = [];
                for (let language of languages) {
                    codes.push(language.code);
                }
                resolve(codes);
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    getTargetLanguages(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            this.translator.getTargetLanguages().then((languages: deepl.Language[]) => {
                let codes: string[] = [];
                for (let language of languages) {
                    codes.push(language.code);
                }
                resolve(codes);
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
        return new Promise<string>((resolve, reject) => {
            this.translator.translateText(source, this.srcLang as deepl.SourceLanguageCode, this.tgtLang as deepl.TargetLanguageCode).then(
                (translation: deepl.TextResult) => {
                    resolve(translation.text);
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