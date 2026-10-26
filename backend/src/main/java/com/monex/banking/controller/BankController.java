package com.monex.banking.controller;

import com.monex.banking.model.*;
import com.monex.banking.repository.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class BankController {

    private final UserRepository userRepo;
    private final LoanRepository loanRepo;

    public BankController(UserRepository u, LoanRepository l){
        this.userRepo=u; this.loanRepo=l;
    }

    @PostMapping("/login")
    public Map<String,Object> login(@RequestBody Map<String,String> req){
        Map<String,Object> res = new HashMap<>();
        Optional<User> u = userRepo.findByUsername(req.get("username"));
        if(u.isPresent() && u.get().getPassword().equals(req.get("password"))){
            res.put("success", true);
            res.put("userId", u.get().getId());
        } else {
            res.put("success", false);
        }
        return res;
    }

    @GetMapping("/account/{id}")
    public User account(@PathVariable Long id){
        return userRepo.findById(id).orElse(null);
    }

    @GetMapping("/beneficiaries")
    public List<User> beneficiaries(){
        return userRepo.findAll();
    }

    @GetMapping("/loans/{id}")
    public List<Loan> loans(@PathVariable Long id){
        return loanRepo.findByUserId(id);
    }

    @PostMapping("/transfer")
    public Map<String,Object> transfer(@RequestBody Map<String,Object> req) throws InterruptedException {
        Map<String,Object> res = new HashMap<>();
        Long fromId = Long.valueOf(req.get("fromId").toString());
        Long toId   = Long.valueOf(req.get("toId").toString());
        BigDecimal amt = new BigDecimal(req.get("amount").toString());
        String mode = req.get("mode").toString();

        User from = userRepo.findById(fromId).orElse(null);
        User to   = userRepo.findById(toId).orElse(null);
        if(from==null || to==null){ res.put("success",false); res.put("msg","Invalid account"); return res; }
        if(from.getBalance().compareTo(amt) < 0){ res.put("success",false); res.put("msg","Insufficient funds"); return res; }

        // NEFT is intentionally slow (> 5 sec). IMPS & RTGS instant.
        if("NEFT".equalsIgnoreCase(mode)){
            Thread.sleep(6000);
        }

        from.setBalance(from.getBalance().subtract(amt));
        to.setBalance(to.getBalance().add(amt));
        userRepo.save(from);
        userRepo.save(to);

        res.put("success", true);
        res.put("mode", mode);
        res.put("newBalance", from.getBalance());
        res.put("msg", mode + " transfer of ₹" + amt + " completed.");
        return res;
    }

    @PostMapping("/loan/pay")
    public Map<String,Object> payLoan(@RequestBody Map<String,Object> req){
        Map<String,Object> res = new HashMap<>();
        Long loanId = Long.valueOf(req.get("loanId").toString());
        BigDecimal amt = new BigDecimal(req.get("amount").toString());
        Loan loan = loanRepo.findById(loanId).orElse(null);
        if(loan==null){ res.put("success",false); return res; }
        loan.setOutstanding(loan.getOutstanding().subtract(amt).max(BigDecimal.ZERO));
        loanRepo.save(loan);
        res.put("success", true);
        res.put("outstanding", loan.getOutstanding());
        return res;
    }
}