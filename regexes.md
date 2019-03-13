Assert toSql

```
assertEquals\('(.+)\',.+
expect(builder.toSql()).toBe('\$1')
```

AssertBinding

```
assertEquals\(\[(.+)?\],.+
expect(builder.getBindings()).toEqual([$1])
```

Raw Class

```
new Raw
new Expression
```
