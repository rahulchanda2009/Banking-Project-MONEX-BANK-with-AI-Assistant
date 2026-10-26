package com.monex.banking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String password;
    @Column(name="full_name") private String fullName;
    @Column(name="account_number") private String accountNumber;
    private BigDecimal balance;
    @Column(name="debit_card_number") private String debitCardNumber;
    @Column(name="debit_card_balance") private BigDecimal debitCardBalance;
    @Column(name="credit_card_number") private String creditCardNumber;
    @Column(name="credit_card_limit") private BigDecimal creditCardLimit;

    // Getters & Setters
    public Long getId(){return id;}
    public String getUsername(){return username;}
    public void setUsername(String u){this.username=u;}
    public String getPassword(){return password;}
    public void setPassword(String p){this.password=p;}
    public String getFullName(){return fullName;}
    public void setFullName(String f){this.fullName=f;}
    public String getAccountNumber(){return accountNumber;}
    public void setAccountNumber(String a){this.accountNumber=a;}
    public BigDecimal getBalance(){return balance;}
    public void setBalance(BigDecimal b){this.balance=b;}
    public String getDebitCardNumber(){return debitCardNumber;}
    public void setDebitCardNumber(String d){this.debitCardNumber=d;}
    public BigDecimal getDebitCardBalance(){return debitCardBalance;}
    public void setDebitCardBalance(BigDecimal d){this.debitCardBalance=d;}
    public String getCreditCardNumber(){return creditCardNumber;}
    public void setCreditCardNumber(String c){this.creditCardNumber=c;}
    public BigDecimal getCreditCardLimit(){return creditCardLimit;}
    public void setCreditCardLimit(BigDecimal c){this.creditCardLimit=c;}
}