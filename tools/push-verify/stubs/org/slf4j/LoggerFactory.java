package org.slf4j;
public class LoggerFactory { public static Logger getLogger(Class<?> c) { return new Logger() { public void warn(String m) { System.err.println("WARN " + m); } public void debug(String m, Object a, Object b) { } }; } }
