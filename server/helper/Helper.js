import bcrypt from "bcrypt";
const saltRounds = 10;
// const { MongoClient, ObjectId } = require("mongodb");
import { ObjectId, MongoClient } from "mongodb";
import {getDb, connectToServer} from "./db.js";
/**
 * 
 * @param {any} data 
 */
export function isEmpty(data) {
  if (data == null) return true;
  if (typeof data === "string") return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  if (data instanceof Map || data instanceof Set) return data.size === 0;
  return false;
}

export function decrypt(data) {
  try {
    const decoded = atob(data);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Decryption error:", err.message);
    return null;
  }
}

export function encrypt(data) {
  try {
    const stringData = typeof data === "object" ? JSON.stringify(data) : data;
    return btoa(stringData);
  } catch (err) {
    console.error("Encryption error:", err.message);
    return null;
  }
}
/**
 * Hash a raw password
 * @param {string} rawPassword
 * @returns {Promise<string>} hashed password
 */
export async function hashPass(rawPassword) {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(rawPassword, salt);
}

/**
 * Validate a password against a hash
 * @param {string} inputPassword
 * @param {string} passwordHashed
 * @returns {Promise<boolean>}
 */
export async function validateHash(inputPassword, passwordHashed) {
  try {
    return await bcrypt.compare(inputPassword, passwordHashed);
  } catch (err) {
    console.error("Password validation error:", err.message);
    return false;
  }
}

/**
 * Insert a single document into a collection
 * @param {string} target_collection The collection to insert into
 * @param {object} data The document to insert
 * @returns {Promise<object>} Result object
 */
export async function insert_one_helper(target_collection, data) {
  const db_connect = getDb();

  try {
    const inserted_result = await db_connect
      .collection(target_collection)
      .insertOne(data);

    return {
      remarks: "success",
      message: "Successfully Added",
      return: Buffer.from(inserted_result.insertedId.toString(), "utf8").toString("base64"),
      payload: null,
    };
  } catch (err) {
    console.error("Insert error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Update a single document in a collection
 * @param {string} target_collection The collection to update
 * @param {object} target_query The filter query to match the document
 * @param {object} set_data The update operation (e.g. { $set: { field: value } })
 * @returns {Promise<object>} Result object
 */
export async function update_one_helper(target_collection, target_query, set_data) {
  const db_connect = getDb();

  try {
    const result = await db_connect
      .collection(target_collection)
      .updateOne(target_query, set_data);

    if (result.matchedCount === 0) {
      return {
        remarks: "failed",
        message: "No document matched the query",
        payload: null,
      };
    }

    return {
      remarks: "success",
      message: "Successfully Updated",
      payload: null,
    };
  } catch (err) {
    console.error("Update error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Delete or archive a single document in a collection
 * @param {string} target_collection The collection to modify
 * @param {object} target_query The filter query (not limited to ObjectId)
 * @param {boolean} archive If true, mark as archived instead of deleting
 * @returns {Promise<object>} Result object
 */
export async function delete_or_archive_helper(target_collection, target_query, archive = false) {
  const db_connect = getDb();

  try {
    let result;

    if (archive) {
      // Archive by setting a flag
      result = await db_connect
        .collection(target_collection)
        .updateOne(target_query, { $set: { archive: 1 } });
    } else {
      // Hard delete
      result = await db_connect
        .collection(target_collection)
        .deleteOne(target_query);
    }

    if (result.matchedCount === 0 && result.deletedCount === 0) {
      return {
        remarks: "failed",
        message: "No document matched the query",
        payload: null,
      };
    }

    return {
      remarks: "success",
      message: archive ? "Successfully Archived" : "Successfully Deleted",
      payload: null,
    };
  } catch (err) {
    console.error("Delete/Archive error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Delete or archive multiple documents in a collection
 * @param {string} target_collection The collection to modify
 * @param {object} target_query The filter query (e.g. { _id: { $in: [...] } })
 * @param {boolean} archive If true, mark as archived instead of deleting
 * @returns {Promise<object>} Result object
 */
export async function delete_or_archive_many_helper(target_collection, target_query, archive = false) {
  const db_connect = getDb();

  try {
    let result;

    if (archive) {
      // Archive by setting a flag on all matched docs
      result = await db_connect
        .collection(target_collection)
        .updateMany(target_query, { $set: { archive: 1 } });
    } else {
      // Hard delete all matched docs
      result = await db_connect
        .collection(target_collection)
        .deleteMany(target_query);
    }

    if (result.matchedCount === 0 && result.deletedCount === 0) {
      return {
        remarks: "failed",
        message: "No documents matched the query",
        payload: null,
      };
    }

    return {
      remarks: "success",
      message: archive ? "Successfully Archived" : "Successfully Deleted",
      payload: {
        matched: result.matchedCount ?? result.deletedCount,
        modified: result.modifiedCount ?? result.deletedCount,
      },
    };
  } catch (err) {
    console.error("Batch Delete/Archive error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Get documents from a collection
 * @param {string} target_collection The collection to query
 * @param {object|array} target_query Either a filter object or an aggregation pipeline array
 * @returns {Promise<object>} Result object
 */
export async function get_data_helper(target_collection, target_query = {}) {
  const db_connect = getDb();

  try {
    let result;

    if (Array.isArray(target_query)) {
      result = await db_connect
        .collection(target_collection)
        .aggregate(target_query)
        .toArray();
    } else {
      result = await db_connect
        .collection(target_collection)
        .find(target_query)
        .toArray();
    }
    return {
      remarks: "success",
      message: "Data fetched successfully",
      payload: result,
    };
  } catch (err) {
    console.error("Get data error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Check if records exist in a collection
 * @param {string} target_collection The collection to query
 * @param {object|array} query Either a filter object or an aggregation pipeline array
 * @returns {Promise<object>} Result object
 */
export async function check_record_exists(target_collection, query = {}) {
  const db_connect = getDb();

  try {
    let result;

    if (Array.isArray(query)) {
      result = await db_connect
        .collection(target_collection)
        .aggregate(query)
        .toArray();
    } else {
      result = await db_connect
        .collection(target_collection)
        .find(query)
        .toArray();
    }

    return {
      remarks: "success",
      message: result.length > 0 ? "Records found" : "No records found",
      payload: result,
    };
  } catch (err) {
    console.error("Check record error:", err.message);
    return {
      remarks: "failed",
      message: "Something went wrong",
      error: err,
      payload: null,
    };
  }
}

/**
 * Restore a single document by _id (set archive = 0)
 * @param {string} target_collection The collection to update
 * @param {string} _id The document _id to restore
 * @param {string} [db] Optional database name (if you want to connect to another DB)
 * @returns {Promise<boolean>} true if restored, false otherwise
 */
async function restore_data(target_collection, _id, db) {
  try {
    let db_connect = getDb();

    const myquery = { _id: new ObjectId(_id) };
    const newvalues = { $set: { archive: 0 } };

    const result = await db_connect
      .collection(target_collection)
      .updateOne(myquery, newvalues);

    return result.matchedCount > 0 && result.modifiedCount > 0;
  } catch (err) {
    console.error("Restore error:", err.message);
    return false;
  }
}

export async function checkAuth(token, _id, callback) {
  if (!token || !ObjectId.isValid(_id)) {
    return callback(false);
  }

  try {
    const user_query = [
      {
        $match: {
          _id: new ObjectId(_id),
          token: token,
          is_verified: true,
        }
      }
    ];

    const result = await check_record_exists("users", user_query);

    if (result?.payload?.length > 0) {
      const user = result.payload[0];

      const expiryLimit = new Date();
      expiryLimit.setHours(expiryLimit.getHours() - 24);

      if (user.lastLogin && new Date(user.lastLogin) < expiryLimit) {
        return callback(false);
      }

      return callback(true);
    }

    return callback(false);
  } catch (error) {
    console.error("Auth check error:", error);
    return callback(false);
  }
}

export async function actionLog(userId, actionType, description) {
  const db_connect = getDb();
  try {
    await db_connect.collection("action_logs").insertOne({
      userId: userId ? new ObjectId(userId): null,
      actionType,
      description,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Action log error:", err.message);
  }
}