import type { JordStoragePort } from "../storage/port.js";
import { recordBlobBytesWritten } from "./metrics.js";
import { withStorageSpan } from "./spans.js";

/** Wrap a storage port with `jord.storage` spans + blob byte counter. */
export function instrumentStorage(port: JordStoragePort): JordStoragePort {
  return {
    kind: port.kind,
    ensureBucket(bucket) {
      return withStorageSpan({ op: "ensureBucket", bucket }, () =>
        port.ensureBucket(bucket),
      );
    },
    async putObject(bucket, key, bytes, contentType) {
      const size = bytes.byteLength;
      const result = await withStorageSpan(
        { op: "putObject", bucket, bytes: size },
        () => port.putObject(bucket, key, bytes, contentType),
      );
      recordBlobBytesWritten(size);
      return result;
    },
    getObject(bucket, key) {
      return withStorageSpan({ op: "getObject", bucket }, () =>
        port.getObject(bucket, key),
      );
    },
    headObject(bucket, key) {
      return withStorageSpan({ op: "headObject", bucket }, () =>
        port.headObject(bucket, key),
      );
    },
    deleteObject(bucket, key) {
      return withStorageSpan({ op: "deleteObject", bucket }, () =>
        port.deleteObject(bucket, key),
      );
    },
    presign(request) {
      return withStorageSpan(
        { op: "presign", bucket: request.bucket },
        () => port.presign(request),
      );
    },
    createMultipartUpload: port.createMultipartUpload
      ? (input) =>
          withStorageSpan(
            { op: "createMultipartUpload", bucket: input.bucket },
            () => port.createMultipartUpload!(input),
          )
      : undefined,
    completeMultipartUpload: port.completeMultipartUpload
      ? (input) =>
          withStorageSpan(
            { op: "completeMultipartUpload", bucket: input.bucket },
            () => port.completeMultipartUpload!(input),
          )
      : undefined,
    abortMultipartUpload: port.abortMultipartUpload
      ? (input) =>
          withStorageSpan(
            { op: "abortMultipartUpload", bucket: input.bucket },
            () => port.abortMultipartUpload!(input),
          )
      : undefined,
    listMultipartParts: port.listMultipartParts
      ? (input) =>
          withStorageSpan(
            { op: "listMultipartParts", bucket: input.bucket },
            () => port.listMultipartParts!(input),
          )
      : undefined,
    writeMultipartPart: port.writeMultipartPart
      ? (uploadId, partNumber, bytes) =>
          port.writeMultipartPart!(uploadId, partNumber, bytes)
      : undefined,
  };
}
