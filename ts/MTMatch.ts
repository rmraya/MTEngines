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

export class MTMatch {

    source: XMLElement;
    target: XMLElement;
    origin: string;

    constructor(source: XMLElement, target: XMLElement, origin: string) {
        this.source = source;
        this.target = target;
        this.origin = origin;
    }

    toJSON(): any {
        return {
            source: this.source.toString(),
            target: this.target.toString(),
            origin: this.origin
        }
    }
}