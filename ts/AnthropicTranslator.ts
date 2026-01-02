/*******************************************************************************
 * Copyright (c) 2023-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse   License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import Anthropic from '@anthropic-ai/sdk';
import { XMLAttribute, XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine.js";
import { MTMatch } from "./MTMatch.js";
import { MTUtils } from "./MTUtils.js";

export class AnthropicTranslator implements MTEngine {

    model: string | undefined;
    anthropic: Anthropic;
    srcLang: string = '';
    tgtLang: string = '';

    constructor(apiKey: string, model?: string) {
        if (model) {
            this.model = model;
        }
        this.anthropic = new Anthropic({ apiKey: apiKey });
    }

    getName(): string {
        return 'Anthropic Claude';
    }

    setModel(model: string): void {
        this.model = model;
    }

    getShortName(): string {
        return 'Anthropic';
    }

    getSourceLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
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
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        return new Promise<string>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text.trim();
                if (translation.startsWith('"""') && translation.endsWith('"""')) {
                    translation = translation.substring(3, translation.length - 3).trim();
                }
                resolve(translation);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement, terms: { source: string, target: string }[]): Promise<MTMatch> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        return new Promise<MTMatch>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text.trim();
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (translation.startsWith('```') && translation.endsWith('```')) {
                    translation = translation.substring(3, translation.length - 3).trim();
                }
                let target: XMLElement = MTUtils.toXMLElement(translation);
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

    async createMessage(source: string): Promise<Anthropic.Message> {
        if (!this.model) {
            throw new Error('Model is not set.');
        }
        return await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: "user", content: source }],
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
        return true;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        return new Promise<MTMatch>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text;
                let target: XMLElement = MTUtils.toXMLElement(translation);
                let space: XMLAttribute | undefined = originalSource.getAttribute('xml:space');
                if (space) {
                    target.setAttribute(space);
                }
                resolve(new MTMatch(originalSource, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        return new Promise<XMLElement>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text;
                let target: XMLElement = MTUtils.toXMLElement(translation);
                let space: XMLAttribute | undefined = source.getAttribute('xml:space');
                if (space) {
                    target.setAttribute(space);
                }
                resolve(target);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    async getAvailableModels(): Promise<string[][]> {
        if (!this.anthropic.apiKey) {
            return Promise.reject(new Error('API key is not set.'));
        }
        try {
            const response = await fetch('https://api.anthropic.com/v1/models', {
                method: 'GET',
                headers: {
                    'x-api-key': this.anthropic.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: any = await response.json();
            return data.data.map((model: any) => [model.id, model.display_name]);
        } catch (error) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }
}