package com.lifely.push;
public class PushProperties {
  public String publicKey = "", privateKey = "", subject = ""; public int ttl = 86400;
  public boolean hasKeys() { return !publicKey.isBlank() && !privateKey.isBlank() && !subject.isBlank(); }
  public String getPublicKey() { return publicKey; } public String getPrivateKey() { return privateKey; }
  public String getSubject() { return subject; } public int getTtlSeconds() { return ttl; }
}
