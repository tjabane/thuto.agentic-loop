import assert from "node:assert/strict"
import {describe, test} from "node:test"

import {Enviroment} from "../src/enviroment.js"

describe("Enviroment", () => {
    test("starts at the origin with the key uncollected and the exit locked", () => {
        const enviroment = new Enviroment(
            3,
            {x: 1, y: 1},
            {x: 2, y: 2},
            new Set(),
        )

        assert.deepEqual(enviroment.getState(), {
            keyPosition: {x: 1, y: 1},
            existPosition: {x: 2, y: 2},
            agentPostion: {x: 0, y: 0},
            isKeyTaken: false,
            isExistLocked: true,
        })
    })

    test("moves one cell in each direction", () => {
        const enviroment = new Enviroment(
            3,
            {x: 2, y: 2},
            {x: 2, y: 2},
            new Set(),
        )

        assert.deepEqual(enviroment.move("right"), {x: 1, y: 0})
        assert.deepEqual(enviroment.move("down"), {x: 1, y: 1})
        assert.deepEqual(enviroment.move("left"), {x: 0, y: 1})
        assert.deepEqual(enviroment.move("up"), {x: 0, y: 0})
    })

    test("does not move beyond any grid boundary", () => {
        const enviroment = new Enviroment(
            2,
            {x: 1, y: 1},
            {x: 1, y: 1},
            new Set(),
        )

        assert.deepEqual(enviroment.move("up"), {x: 0, y: 0})
        assert.deepEqual(enviroment.move("left"), {x: 0, y: 0})

        assert.deepEqual(enviroment.move("right"), {x: 1, y: 0})
        assert.deepEqual(enviroment.move("right"), {x: 1, y: 0})

        assert.deepEqual(enviroment.move("down"), {x: 1, y: 1})
        assert.deepEqual(enviroment.move("down"), {x: 1, y: 1})
    })

    test("does not enter a blocked cell", () => {
        const enviroment = new Enviroment(
            3,
            {x: 2, y: 2},
            {x: 2, y: 2},
            new Set([{x: 1, y: 0}, {x: 0, y: 1}]),
        )

        assert.deepEqual(enviroment.move("right"), {x: 0, y: 0})
        assert.deepEqual(enviroment.move("down"), {x: 0, y: 0})
        assert.deepEqual(enviroment.getState().agentPostion, {x: 0, y: 0})
    })

    test("matches blocked cells by coordinates rather than object identity", () => {
        const blockedPosition = {x: 1, y: 0}
        const enviroment = new Enviroment(
            2,
            {x: 1, y: 1},
            {x: 1, y: 1},
            new Set([blockedPosition]),
        )

        assert.notStrictEqual(blockedPosition, enviroment.getState().agentPostion)
        assert.deepEqual(enviroment.move("right"), {x: 0, y: 0})
    })

    test("takes the key only while standing on its cell and only once", () => {
        const enviroment = new Enviroment(
            2,
            {x: 1, y: 0},
            {x: 1, y: 1},
            new Set(),
        )

        assert.equal(enviroment.takeKey(), false)
        assert.equal(enviroment.getState().isKeyTaken, false)

        enviroment.move("right")
        assert.equal(enviroment.takeKey(), true)
        assert.equal(enviroment.getState().isKeyTaken, true)
        assert.equal(enviroment.takeKey(), false)
    })

    test("takes a key located at the starting position", () => {
        const enviroment = new Enviroment(
            1,
            {x: 0, y: 0},
            {x: 0, y: 0},
            new Set(),
        )

        assert.equal(enviroment.takeKey(), true)
        assert.equal(enviroment.getState().isKeyTaken, true)
    })

    test("does not unlock the exit without the key", () => {
        const enviroment = new Enviroment(
            2,
            {x: 1, y: 1},
            {x: 0, y: 0},
            new Set(),
        )

        assert.equal(enviroment.unlockExist(), false)
        assert.equal(enviroment.getState().isExistLocked, true)
    })

    test("does not unlock the exit while away from its cell", () => {
        const enviroment = new Enviroment(
            2,
            {x: 0, y: 0},
            {x: 1, y: 1},
            new Set(),
        )

        assert.equal(enviroment.takeKey(), true)
        assert.equal(enviroment.unlockExist(), false)
        assert.equal(enviroment.getState().isExistLocked, true)
    })

    test("unlocks the exit with the key while on the exit cell and only once", () => {
        const enviroment = new Enviroment(
            2,
            {x: 0, y: 0},
            {x: 1, y: 1},
            new Set(),
        )

        assert.equal(enviroment.takeKey(), true)
        enviroment.move("right")
        enviroment.move("down")

        assert.equal(enviroment.unlockExist(), true)
        assert.equal(enviroment.getState().isExistLocked, false)
        assert.equal(enviroment.unlockExist(), false)
    })

    test("preserves key and exit state while the agent moves", () => {
        const enviroment = new Enviroment(
            2,
            {x: 0, y: 0},
            {x: 1, y: 0},
            new Set(),
        )

        enviroment.takeKey()
        enviroment.move("right")
        enviroment.unlockExist()
        enviroment.move("left")

        assert.deepEqual(enviroment.getState(), {
            keyPosition: {x: 0, y: 0},
            existPosition: {x: 1, y: 0},
            agentPostion: {x: 0, y: 0},
            isKeyTaken: true,
            isExistLocked: false,
        })
    })

    test("inspects only the agent's current node", () => {
        const enviroment = new Enviroment(
            3,
            {x: 1, y: 0},
            {x: 2, y: 0},
            new Set(),
        )

        assert.deepEqual(enviroment.inspectCurrentNode(), {
            position: {x: 0, y: 0},
            hasKey: false,
            hasExit: false,
            isExitLocked: true,
        })

        enviroment.move("right")
        assert.deepEqual(enviroment.inspectCurrentNode(), {
            position: {x: 1, y: 0},
            hasKey: true,
            hasExit: false,
            isExitLocked: true,
        })

        enviroment.takeKey()
        assert.equal(enviroment.inspectCurrentNode().hasKey, false)

        enviroment.move("right")
        assert.deepEqual(enviroment.inspectCurrentNode(), {
            position: {x: 2, y: 0},
            hasKey: false,
            hasExit: true,
            isExitLocked: true,
        })
    })
})
