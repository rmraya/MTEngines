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

import { DOMBuilder, SAXParser, XMLAttribute, XMLDocument, XMLElement } from 'typesxml';
import { MTEngine } from './MTEngine.js';
import { MTMatch } from './MTMatch.js';
import { MTUtils } from './MTUtils.js';

export class MistralTranslator implements MTEngine {

    apiKey: string;
    model: string | undefined;
    srcLang: string = '';
    tgtLang: string = '';

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        }
    }

    setModel(model: string): void {
        this.model = model;
    }

    getMTMatch(source: XMLElement, terms: { source: string; target: string; }[]): Promise<MTMatch> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        let messages: any[] = [
            {
                role: "user",
                content: prompt,
            },
        ];
        return new Promise<MTMatch>((resolve, reject) => {
            fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((data: any) => {
                let choices: any[] = data.choices;
                let translation: string = choices[0].message.content;
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

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
        return true;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        return new Promise<MTMatch>((resolve, reject) => {
            this.fixTranslation(originalSource, matchSource, matchTarget).then((translation: string) => {
                let target: XMLElement = MTUtils.toXMLElement(translation);
                resolve(new MTMatch(originalSource, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixTranslation(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<string> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        let messages: any[] = [
            { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
            { "role": "user", "content": prompt }
        ];
        return new Promise<string>((resolve, reject) => {
            fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((data: any) => {
                let choices: any[] = data.choices;
                let translation: string = choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target>') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                resolve(translation);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        let messages: any[] = [
            { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
            { "role": "user", "content": prompt }
        ]
        return new Promise<XMLElement>((resolve, reject) => {
            fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((completion: any) => {
                let choices: any[] = completion.choices;
                let translation: string = choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target>') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }

                let contentHandler: DOMBuilder = new DOMBuilder();
                let xmlParser = new SAXParser();
                xmlParser.setContentHandler(contentHandler);
                xmlParser.parseString(translation);
                let newDoc: XMLDocument | undefined = contentHandler.getDocument();
                if (newDoc) {
                    const targetElement = newDoc.getRoot();
                    if (targetElement) {
                        resolve(targetElement);
                    } else {
                        reject(new Error('No root element found in fixTags response'));
                    }
                } else {
                    reject(new Error('Error parsing XML from fixTags response'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getName(): string {
        return 'Mistral AI';
    }

    getShortName(): string {
        return 'Mistral';
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
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let prompt: string = MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        let messages: any[] = [
            {
                role: "user",
                content: prompt,
            },
        ];
        return new Promise<string>((resolve, reject) => {
            fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((data: any) => {
                let choices: any[] = data.choices;
                let translation: string = choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (source.startsWith('"') && source.endsWith('"')) {
                    translation = '"' + translation + '"';
                }
                resolve(translation);
            })
                .catch((error: Error) => {
                    reject(error);
                });

        });
    }

    async getAvailableModels(): Promise<string[][]> {
        if (!this.apiKey) {
            return Promise.reject(new Error('API key is not set.'));
        }
        try {
            const response = await fetch('https://api.mistral.ai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + this.apiKey,
                },
            });
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            const data: any = await response.json();
            return data.data.map((model: any) => [model.id, model.display_name]);
        } catch (error) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }
}