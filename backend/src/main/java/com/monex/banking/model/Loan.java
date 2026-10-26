package com.monex.banking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name = "loans")
public class Loan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="user_id") private Long userId;
    @Column(name="loan_type") private String loanType;
    private BigDecimal amount;
    private BigDecimal outstanding;

    public Long getId(){return id;}
    public Long getUserId(){return userId;}
    public String getLoanType(){return loanType;}
    public BigDecimal getAmount(){return amount;}
    public BigDecimal getOutstanding(){return outstanding;}
    public void setOutstanding(BigDecimal o){this.outstanding=o;}
}