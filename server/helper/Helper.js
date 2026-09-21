const bcrypt = require("bcrypt");
const saltRounds = 10;
const { ObjectId } = require("mongodb");
const dbo = require("./db.js");

function isEmpty(data) {
  if (data == null) return true;
  if (typeof data === "string") return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  if (data instanceof Map || data instanceof Set) return data.size === 0;
  return false;
}

function decrypt(data) {
  try {
    const decoded = atob(data);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Decryption error:", err.message);
    return null;
  }
}

function encrypt(data) {
  try {
    const stringData = typeof data === "object" ? JSON.stringify(data) : data;
    return btoa(stringData);
  } catch (err) {
    console.error("Encryption error:", err.message);
    return null;
  }
}

async function hashPass(rawPassword) {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(rawPassword, salt);
}

async function validateHash(inputPassword, passwordHashed) {
  try {
    return await bcrypt.compare(inputPassword, passwordHashed);
  } catch (err) {
    console.error("Password validation error:", err.message);
    return false;
  }
}

async function insert_one_helper(target_collection, data) {
  const db_connect = dbo.getDb();

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

async function update_one_helper(target_collection, target_query, set_data) {
  const db_connect = dbo.getDb();

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

async function delete_or_archive_helper(target_collection, target_query, archive = false) {
  const db_connect = dbo.getDb();

  try {
    let result;

    if (archive) {
      result = await db_connect
        .collection(target_collection)
        .updateOne(target_query, { $set: { archive: 1 } });
    } else {
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

async function delete_or_archive_many_helper(target_collection, target_query, archive = false) {
  const db_connect = dbo.getDb();

  try {
    let result;

    if (archive) {
      result = await db_connect
        .collection(target_collection)
        .updateMany(target_query, { $set: { archive: 1 } });
    } else {
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

async function get_data_helper(target_collection, target_query = {}) {
  const db_connect = dbo.getDb();

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

async function check_record_exists(target_collection, query = {}) {
  const db_connect = dbo.getDb();

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

async function restore_data(target_collection, _id) {
  try {
    let db_connect = dbo.getDb();

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

async function checkAuth(token, _id, callback) {
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

async function actionLog(userId, actionType, description) {
  const db_connect = dbo.getDb();
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

module.exports = {
  isEmpty,
  decrypt,
  encrypt,
  hashPass,
  validateHash,
  insert_one_helper,
  update_one_helper,
  delete_or_archive_helper,
  delete_or_archive_many_helper,
  get_data_helper,
  check_record_exists,
  restore_data,
  checkAuth,
  actionLog
};